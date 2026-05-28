export default function formatTimestamp(timestamp) {
  const now = Date.now();
  const messageTime = new Date(timestamp).getTime();
  const diff = now - messageTime;
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (diff < 3600000) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  const hrs = Math.floor(diff / 3600000);
  if (diff < 86400000) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(diff / 86400000);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
