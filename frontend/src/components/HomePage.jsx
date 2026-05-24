import React, { useEffect } from 'react';
import { Layout } from './Layout';
import { motion } from 'framer-motion';
import ChatList from '../pages/chatSection/ChatList';
import { useChatStore } from '../store/chatStore';

const HomePage = () => {
    const { contacts, fetchContacts } = useChatStore();

    useEffect(() => {
        fetchContacts();
    }, []);

    return (
        <Layout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className='h-full'
            >
                <ChatList contacts={contacts} />
            </motion.div>
        </Layout>
    );
};

export default HomePage;
