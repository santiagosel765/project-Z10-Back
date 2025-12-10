export const formatDate = (date: Date) => {

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  };

  const formattedDate = new Intl.DateTimeFormat('es-MX', options).format(
    date,
  );

  return formattedDate;
};
