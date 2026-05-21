import React from 'react';
import useLayoutStore from '../../store/layoutStore';
import useThemeStore from '../../store/themeStore';

const ChatList = ({ contacts }) => {
   const setSelectedContact = useLayoutStore(
     (state) => state.setSelectedContact,
    );
    const selectedContact = useLayoutStore((state) => state.selectedContact);

    const {theme}=useThemeStore();
  return <div>chatlist</div>;
};

export default ChatList;
