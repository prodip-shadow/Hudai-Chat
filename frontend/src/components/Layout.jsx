import { useEffect, useState } from 'react';
import useLayoutStore from '../store/layoutStore';
import { Outlet } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import Sidebar from './Sidebar';
import { AnimatePresence, motion } from 'framer-motion';
import ChatWindow from '../pages/chatSection/ChatWindow';
import VideoCallManager from '../pages/VideoCall/VideoCallManager';
import { getSocket } from '../services/chat.service';

export const Layout = ({ children }) => {
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore((state) => state.setSelectedContact);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme } = useThemeStore();
  const socket = getSocket();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const leftPanel = children ?? <Outlet />;

  return (
    <div
      className={`h-dvh overflow-hidden ${theme === 'dark' ? 'bg-[#111b21] text-white' : 'bg-white text-gray-900'} flex`}
    >
      {!isMobile && <Sidebar />}

      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence initial={false}>
          {(!selectedContact || !isMobile) && (
            <motion.div
              key="chatlist"
              initial={{ x: isMobile ? '-100%' : 0 }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`w-full md:w-2/5 h-full flex flex-col ${isMobile ? 'absolute inset-y-0 left-0 w-full pb-14' : ''}`}
            >
              {leftPanel}
            </motion.div>
          )}

          {(selectedContact || !isMobile) && (
            <motion.div
              key="chatWindow"
              initial={{ x: isMobile ? '100%' : 0 }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`w-full h-full ${isMobile ? 'absolute inset-y-0 left-0 w-full' : ''}`}
            >
              <ChatWindow
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
                isMobile={isMobile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isMobile && <Sidebar />}

      {/* Always mounted so incoming calls work regardless of selected contact */}
      <VideoCallManager socket={socket} />
    </div>
  );
};
