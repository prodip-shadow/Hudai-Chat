import React from 'react';
import { useState } from 'react';
import useUserStore from '../store/useUserStore';
import useThemeStore from '../store/themeStore';
import { useEffect } from 'react';
import { updateuserProfile } from '../services/user.service';

import {toast} from 'react-toastify';
import { Layout } from './Layout';
import {motion} from 'framer-motion';


const UserDetails = () => {

    const [name, setName] = useState('');
    const [about, setAbout] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const [preview, setPreview] = useState(null);


    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [showNameEmoji, setShowNameEmoji] = useState(false);
    const [showAboutEmoji, setShowAboutEmoji] = useState(false);

    const {user,setUser}=useUserStore();
    const {theme}=useThemeStore();



    useEffect(() => {
        if (user) {
            setName(user.username || '');
            setAbout(user.about || '')
        }
    }, [user]);



    const handleImageChange = (e) => { 
        const file = e.target.files[0];
        if (file) {
            setProfilePicture(file);
            setPreview(URL.createObjectURL(file));
        }
    }




    const handleSave = async(field) => {
        try {
            const formData = new FormData();
            if (field === 'name') {
                formData.append('username', name);
                setIsEditingName(false)
                setShowNameEmoji(false)
            } else if (field === 'about') { 
                formData.append('about', about);
                setIsEditingAbout(false)
                setShowAboutEmoji(false)
            }




            if (profilePicture && field === 'profile') { 
                formData.append('media', profilePicture);
            }

            const updated = await updateuserProfile(formData);
            setUser(updated?.data);
            setProfilePicture(null);
            setPreview(null);
            toast.seccess('Profile updated successfully');

        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        }
    }




    const handleEmojiSelect = (emoji, field) => { 
        if (field === 'name') {
            setName((prev) => prev + emoji.emoji);
            setShowNameEmoji(false)
        } else {
            setAbout((prev) => prev + emoji.emoji);
            setShowAboutEmoji(false)
        }
    }



    return (
        <Layout>
            
        </Layout>
    );
};

export default UserDetails;