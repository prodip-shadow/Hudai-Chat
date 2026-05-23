import React, { useRef, useState } from 'react';

const MessageBubble = ({
  message,
  theme,
  currentUser,
  onReact,
  deleteMessage,
}) => {

    console.log('Rendering MessageBubble for message:', message);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    
    

    const messageRef = useRef(null);
    const optionsRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const reactionsRef = useRef(null);



    const isUserMessage = message.sender._id === currentUser._id;



    const bubbleClass = isUserMessage ? `chat-end` : `chat-start`;

    const bubbleContentClass = isUserMessage
      ? `chat-bubble md:max-w-[50%] min-w-[130px] ${theme === 'dark' ? 'bg-[#144d38] text-white' : 'bg-[#d9fdd3] text-black'}`
      : `chat-bubble md:max-w-[50%] min-w-[130px] ${theme === 'dark' ? 'bg-[rgb(17,27,33)] text-white' : 'bg-white text-black'}`;

    
    const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    




    const handleReact = (emoji) => { 
        onReact(message._id, emoji);
        setShowEmojiPicker(false);
        setShowReactions(false);
    }

    if (message === 0) return; 

  return <div>{message.content}</div>;
};

export default MessageBubble;
