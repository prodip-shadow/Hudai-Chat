import { useEffect } from "react"



const useOutsideClick = (ref, callback) => { 
    useEffect(() => {
        const handleoutsideClick = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {

                callback()
             }

        };
        
        document.addEventListener('mousedown', handleoutsideClick)
        return () => { 
            document.removeEventListener('mousedown', handleoutsideClick)
        }

    },[ref, callback])
}


export default useOutsideClick