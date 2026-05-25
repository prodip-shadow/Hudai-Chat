import { useEffect } from 'react';
import ChatList from '../pages/chatSection/ChatList';
import { useChatStore } from '../store/chatStore';

const HomePage = () => {
    const { contacts, fetchContacts } = useChatStore();

    useEffect(() => {
        fetchContacts();
    }, []);

    return <ChatList contacts={contacts} />
};

export default HomePage;
