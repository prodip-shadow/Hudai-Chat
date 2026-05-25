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
  // eslint-disable-next-line no-unused-vars
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
              ? 'w-7 h-2 bg-green-500'
              : s < step
              ? 'w-2 h-2 bg-green-300'
              : 'w-2 h-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );

  const slideVariants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  };

  const cleanInput = `flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 transition-all focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 shadow-sm`;
  const inputInner = `flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400`;
  const primaryBtn = `w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center justify-center bg-gradient-to-r from-green-400 to-blue-500 text-white hover:opacity-95 active:scale-[0.98] shadow-md disabled:opacity-50`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex flex-col">

      {/* ── Brand area ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center pt-16 pb-6 px-6 text-center"
      >
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-5 shadow-lg border border-gray-100">
          <img src={Logo} alt="Logo" className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Merno</h1>
        <p className="text-white/80 text-sm mt-2 font-medium">
          {step === 1 ? 'Sign in to your account' : step === 2 ? 'Verify your identity' : 'Complete your profile'}
        </p>
      </motion.div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex flex-col items-center px-5 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-xl border border-gray-100"
        >
          <StepDots />

          {error && (
            <div className="text-sm text-center mb-5 rounded-xl py-3 px-4 bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
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
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
                onSubmit={handleLoginSubmit(onLoginSubmit)}
              >
                <p className="text-gray-500 text-sm text-center mb-2">
                  Enter your email to receive an OTP
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
                  <div className={`${cleanInput} ${loginErrors.email ? 'border-red-400 focus-within:ring-red-400 focus-within:border-red-400' : ''}`}>
                    <MdEmail className="text-gray-400 shrink-0" size={18} />
                    <input
                      type="email"
                      {...loginRegister('email')}
                      value={email}
                      placeholder="Email address"
                      onChange={e => setEmail(e.target.value)}
                      className={inputInner}
                    />
                  </div>
                  {loginErrors.email && <p className="text-red-500 text-xs mt-1.5 ml-1">{loginErrors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`${primaryBtn}`}
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
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-5"
                onSubmit={handleOtpSubmit(onOtpSubmit)}
              >
                <p className="text-gray-500 text-sm text-center leading-relaxed mb-2">
                  Enter the 6-digit code sent to{' '}
                  <span className="text-gray-800 font-semibold">
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
                      className={`w-11 h-12 text-center text-xl font-bold rounded-xl outline-none transition-all border ${
                        otpErrors.otp
                          ? 'bg-red-50 border-red-400 text-red-700 focus:ring-1 focus:ring-red-400'
                          : digit
                          ? 'bg-white border-green-500 text-green-600 focus:ring-1 focus:ring-green-500'
                          : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-500'
                      }`}
                    />
                  ))}
                </div>
                {otpErrors.otp && <p className="text-red-500 text-xs text-center">{otpErrors.otp.message}</p>}

                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  className={`${primaryBtn}`}
                >
                  {loading ? <Spinner /> : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50"
                >
                  <FaArrowLeft size={11} />
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
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
                onSubmit={handleProfileSubmit(onProfileSubmit)}
              >
                {/* Avatar picker */}
                <div className="flex flex-col items-center">
                  <div className="relative w-22 h-22 mb-4">
                    <img
                      src={profilePicture ? URL.createObjectURL(profilePicture) : selectedAvatar}
                      alt="profile"
                      className="w-22 h-22 object-cover rounded-full ring-4 ring-gray-100 shadow-md"
                    />
                    <label
                      htmlFor="profile-picture"
                      className="absolute bottom-0.5 right-0.5 bg-gradient-to-r from-green-400 to-blue-500 text-white hover:opacity-90 p-2 rounded-full cursor-pointer transition-colors shadow-md flex items-center justify-center"
                    >
                      <FaPlus size={9} />
                    </label>
                    <input type="file" id="profile-picture" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>

                  <p className="text-gray-400 text-xs mb-3">Or choose an avatar</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {avatars.map((a, i) => (
                      <img
                        key={i}
                        src={a}
                        alt=""
                        onClick={() => setSelectedAvatar(a)}
                        className={`w-11 h-11 rounded-full cursor-pointer transition-all hover:scale-110 ${
                          selectedAvatar === a && !profilePicture
                            ? 'ring-3 ring-green-500 scale-110 shadow-md'
                            : 'opacity-60 hover:opacity-90'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <div className={`${cleanInput} ${profileErrors.username ? 'border-red-400 focus-within:ring-red-400 focus-within:border-red-400' : ''}`}>
                    <FaUser className="text-gray-400 shrink-0" size={13} />
                    <input
                      {...profileRegister('username')}
                      type="text"
                      placeholder="Your display name"
                      className={inputInner}
                    />
                  </div>
                  {profileErrors.username && <p className="text-red-500 text-xs mt-1.5 ml-1">{profileErrors.username.message}</p>}
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="agreed"
                    {...profileRegister('agreed')}
                    className="mt-0.5 accent-green-500 cursor-pointer"
                  />
                  <label htmlFor="agreed" className="text-xs cursor-pointer leading-relaxed text-gray-500">
                    I agree to the{' '}
                    <a href="#" className="text-green-600 font-medium underline underline-offset-2 hover:text-green-700">Terms and Conditions</a>
                  </label>
                </div>
                {profileErrors.agreed && <p className="text-red-500 text-xs">{profileErrors.agreed.message}</p>}

                <button
                  type="submit"
                  disabled={!watch('agreed') || loading}
                  className={`${primaryBtn}`}
                >
                  {loading ? <Spinner /> : 'Create Profile'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
