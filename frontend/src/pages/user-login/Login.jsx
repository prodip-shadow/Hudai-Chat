import React, { useState } from 'react';
import useLoginStore from '../../store/useLoginStore';
import countries from '../../utils/countriles';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../../store/useUserStore';
import { useForm } from 'react-hook-form';
import useThemeStore from '../../store/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../../images/logo.png';
import { FaArrowLeft, FaChevronDown, FaPlus, FaUser } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import Spinner from '../../utils/Spinner';
import { sendOtp, updateuserProfile, verifyOtp } from '../../services/user.service';
import { toast } from 'react-toastify';

const loginValidationSchema = yup.object().shape({
  phoneNumber: yup.string().nullable().notRequired()
    .matches(/^\d+$/, 'Phone number must be digits')
    .transform((v, o) => o.trim() === '' ? null : v),
  email: yup.string().nullable().notRequired()
    .email('Please enter a valid email address')
    .transform((v, o) => o.trim() === '' ? null : v),
}).test('at-least-one', 'Either phone number or email is required', v => !!(v.phoneNumber || v.email));

const otpValidationSchema = yup.object().shape({
  otp: yup.string().length(6, 'OTP must be 6 digits').required('OTP is required'),
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required('Username is required'),
  agreed: yup.bool().oneOf([true], 'You must agree to the terms and conditions'),
});

const avatars = [
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
];

const inputClass = (dark, hasError) =>
  `w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all border ${
    hasError ? 'border-red-400' : dark ? 'border-white/10 focus:border-green-500' : 'border-gray-200 focus:border-green-500'
  } ${dark ? 'bg-white/5 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'}`;

export const Login = () => {
  const { step, setStep, setUserPhoneData, userPhoneData, resetLoginState } = useLoginStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { theme } = useThemeStore();
  const dark = theme === 'dark';

  const { register: loginRegister, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } =
    useForm({ resolver: yupResolver(loginValidationSchema) });

  const { handleSubmit: handleOtpSubmit, formState: { errors: otpErrors }, setValue: setOtpValue } =
    useForm({ resolver: yupResolver(otpValidationSchema) });

  const { register: profileRegister, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors }, watch } =
    useForm({ resolver: yupResolver(profileValidationSchema) });

  const filterCountry = countries.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.dialCode.includes(searchTerm)
  );

  const onLoginSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      if (email) {
        const res = await sendOtp(null, null, email);
        if (res.status === 'success') {
          toast.info('OTP sent to your email!');
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        const res = await sendOtp(phoneNumber, selectedCountry.dialCode);
        if (res.status === 'success') {
          toast.info('OTP sent to your phone!');
          setUserPhoneData({ phoneNumber, phoneSuffix: selectedCountry.dialCode });
          setStep(2);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      if (!userPhoneData) throw new Error('Phone or email data is missing');
      const otpString = otp.join('');
      const res = userPhoneData?.email
        ? await verifyOtp(null, null, otpString, userPhoneData.email)
        : await verifyOtp(userPhoneData.phoneNumber, userPhoneData.phoneSuffix, otpString);

      if (res.status === 'success') {
        toast.success('OTP verified!');
        const user = res.data?.user;
        if (user?.username && user?.profilePicture) {
          setUser(user);
          navigate('/');
          resetLoginState();
        } else {
          setStep(3);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setProfilePicture(file);
  };

  const onProfileSubmit = async (formValues) => {
    try {
      setLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('username', formValues.username);
      formData.append('agreed', String(Boolean(formValues.agreed)));
      if (profilePicture) formData.append('media', profilePicture);
      else formData.append('profilePicture', selectedAvatar);

      const result = await updateuserProfile(formData);
      if (result?.data?.user) setUser(result.data.user);
      toast.success('Welcome!');
      navigate('/');
      resetLoginState();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // OTP handlers
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setOtpValue('otp', newOtp.join(''));
    if (digit && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      if (newOtp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
        setOtpValue('otp', newOtp.join(''));
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        setOtpValue('otp', newOtp.join(''));
        document.getElementById(`otp-${index - 1}`)?.focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = ['', '', '', '', '', ''];
    pasted.split('').forEach((char, i) => { if (i < 6) newOtp[i] = char; });
    setOtp(newOtp);
    setOtpValue('otp', newOtp.join(''));
    document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`rounded-full transition-all duration-300 ${
            s === step
              ? 'w-5 h-2 bg-green-500'
              : s < step
              ? 'w-2 h-2 bg-green-400'
              : `w-2 h-2 ${dark ? 'bg-white/20' : 'bg-gray-200'}`
          }`}
        />
      ))}
    </div>
  );

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${dark ? 'bg-[#111b21]' : 'bg-[#f0f2f5]'}`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`w-full max-w-sm rounded-2xl shadow-xl overflow-hidden ${dark ? 'bg-[#202c33] text-white' : 'bg-white text-gray-900'}`}
      >
        {/* Top bar */}
        <div className="bg-green-500 px-6 pt-8 pb-6 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <img src={Logo} alt="Logo" className="w-9 h-9" />
          </div>
          <h1 className="text-xl font-bold text-white">Hudai Chat</h1>
          <p className="text-green-100 text-sm mt-0.5">
            {step === 1 ? 'Sign in to continue' : step === 2 ? 'Verify your identity' : 'Set up your profile'}
          </p>
        </div>

        <div className="px-6 py-5">
          <StepDots />

          {error && (
            <p className="text-red-500 text-sm text-center mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg py-2 px-3">
              {error}
            </p>
          )}

          <AnimatePresence mode="wait">
            {/* ── Step 1: Phone / Email ── */}
            {step === 1 && (
              <motion.form
                key="step1"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-3"
                onSubmit={handleLoginSubmit(onLoginSubmit)}
              >
                <p className={`text-xl text-center mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Enter your  email to receive an OTP
                </p>

                {/* Phone row */}
                {/* <div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className={`flex items-center gap-1 px-2.5 py-2.5 rounded-xl text-sm border transition-all ${
                          dark
                            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span className="text-xs">{selectedCountry.dialCode}</span>
                        <FaChevronDown size={10} className="text-gray-400" />
                      </button>

                      {showDropdown && (
                        <div className={`absolute z-20 top-full left-0 mt-1 w-56 rounded-xl shadow-xl border overflow-hidden ${
                          dark ? 'bg-[#2a3942] border-white/10' : 'bg-white border-gray-100'
                        }`}>
                          <div className="p-2">
                            <input
                              type="text"
                              placeholder="Search country…"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-sm outline-none border ${
                                dark ? 'bg-white/10 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800'
                              }`}
                            />
                          </div>
                          <div className="max-h-44 overflow-y-auto">
                            {filterCountry.map(c => (
                              <button
                                key={c.alpha2}
                                type="button"
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                  dark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-50 text-gray-800'
                                }`}
                                onClick={() => { setSelectedCountry(c); setShowDropdown(false); }}
                              >
                                {c.flag} {c.name} <span className="text-gray-400">{c.dialCode}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      {...loginRegister('phoneNumber')}
                      value={phoneNumber}
                      placeholder="Phone number"
                      onChange={e => setPhoneNumber(e.target.value)}
                      className={inputClass(dark, !!loginErrors.phoneNumber) + ' flex-1'}
                    />
                  </div>
                  {loginErrors.phoneNumber && <p className="text-red-400 text-xs mt-1">{loginErrors.phoneNumber.message}</p>}
                </div> */}

                {/* <div className={`flex items-center gap-2 text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <div className="flex-1 h-px bg-current opacity-30" />
                  <span>or</span>
                  <div className="flex-1 h-px bg-current opacity-30" />
                </div> */}

                {/* Email row */}
                <div>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 transition-all ${
                    dark ? 'bg-white/5 border-white/10 focus-within:border-green-500' : 'bg-gray-50 border-gray-200 focus-within:border-green-500'
                  } ${loginErrors.email ? 'border-red-400' : ''}`}>
                    <MdEmail className="text-gray-400 shrink-0" size={16} />
                    <input
                      type="email"
                      {...loginRegister('email')}
                      value={email}
                      placeholder="Email address"
                      onChange={e => setEmail(e.target.value)}
                      className={`flex-1 bg-transparent outline-none text-sm ${dark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>
                  {loginErrors.email && <p className="text-red-400 text-xs mt-1">{loginErrors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center mt-1"
                >
                  {loading ? <Spinner /> : 'Send OTP'}
                </button>
              </motion.form>
            )}

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <motion.form
                key="step2"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-4"
                onSubmit={handleOtpSubmit(onOtpSubmit)}
              >
                <p className={`text-xs text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Enter the 6-digit code sent to{' '}
                  <span className="font-medium">
                    {userPhoneData?.email || `${userPhoneData?.phoneSuffix} ${userPhoneData?.phoneNumber}`}
                  </span>
                </p>

                {/* OTP boxes */}
                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className={`w-11 h-12 text-center text-lg font-semibold rounded-xl border outline-none transition-all
                        ${otpErrors.otp ? 'border-red-400' : dark
                          ? 'bg-white/5 border-white/10 text-white focus:border-green-500 focus:bg-white/10'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-green-500 focus:bg-white'
                        }`}
                    />
                  ))}
                </div>
                {otpErrors.otp && <p className="text-red-400 text-xs text-center">{otpErrors.otp.message}</p>}

                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center"
                >
                  {loading ? <Spinner /> : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className={`w-full py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
                    dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <FaArrowLeft size={12} />
                  Go back
                </button>
              </motion.form>
            )}

            {/* ── Step 3: Profile ── */}
            {step === 3 && (
              <motion.form
                key="step3"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-4"
                onSubmit={handleProfileSubmit(onProfileSubmit)}
              >
                {/* Avatar picker */}
                <div className="flex flex-col items-center">
                  <div className="relative w-20 h-20 mb-3">
                    <img
                      src={profilePicture ? URL.createObjectURL(profilePicture) : selectedAvatar}
                      alt="profile"
                      className="w-full h-full object-cover rounded-full ring-2 ring-green-500/30"
                    />
                    <label
                      htmlFor="profile-picture"
                      className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-full cursor-pointer transition-colors"
                    >
                      <FaPlus size={10} />
                    </label>
                    <input type="file" id="profile-picture" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>

                  <p className={`text-xs mb-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Or choose an avatar</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {avatars.map((a, i) => (
                      <img
                        key={i}
                        src={a}
                        alt=""
                        onClick={() => setSelectedAvatar(a)}
                        className={`w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110 ${
                          selectedAvatar === a && !profilePicture ? 'ring-2 ring-green-500 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 transition-all ${
                    dark ? 'bg-white/5 border-white/10 focus-within:border-green-500' : 'bg-gray-50 border-gray-200 focus-within:border-green-500'
                  } ${profileErrors.username ? 'border-red-400' : ''}`}>
                    <FaUser className="text-gray-400 shrink-0" size={13} />
                    <input
                      {...profileRegister('username')}
                      type="text"
                      placeholder="Your name"
                      className={`flex-1 bg-transparent outline-none text-sm ${dark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>
                  {profileErrors.username && <p className="text-red-400 text-xs mt-1">{profileErrors.username.message}</p>}
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="agreed"
                    {...profileRegister('agreed')}
                    className="mt-0.5 accent-green-500 cursor-pointer"
                  />
                  <label htmlFor="agreed" className={`text-xs cursor-pointer ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    I agree to the{' '}
                    <a href="#" className="text-green-500 underline underline-offset-2">Terms and Conditions</a>
                  </label>
                </div>
                {profileErrors.agreed && <p className="text-red-400 text-xs">{profileErrors.agreed.message}</p>}

                <button
                  type="submit"
                  disabled={!watch('agreed') || loading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center"
                >
                  {loading ? <Spinner /> : 'Create Profile'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
