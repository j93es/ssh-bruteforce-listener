const getDateStr = () => {
  const koreaDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
  const day = koreaDate.getUTCDate().toString().padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[koreaDate.getUTCMonth()];
  const year = koreaDate.getUTCFullYear();
  const hours = koreaDate.getUTCHours().toString().padStart(2, "0");
  const minutes = koreaDate.getUTCMinutes().toString().padStart(2, "0");
  const seconds = koreaDate.getUTCSeconds().toString().padStart(2, "0");

  const formattedDate = `${day}/${month}/${year}:${hours}:${minutes}:${seconds} +0900`;
  return formattedDate;
};

export { getDateStr };
