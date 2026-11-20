export const TIMEZONES = [
  ['Europe/Kaliningrad', 'Калининград'],
  ['Europe/Moscow', 'Москва'],
  ['Europe/Samara', 'Самара'],
  ['Asia/Yekaterinburg', 'Екатеринбург'],
  ['Asia/Omsk', 'Омск'],
  ['Asia/Novosibirsk', 'Новосибирск'],
  ['Asia/Krasnoyarsk', 'Красноярск'],
  ['Asia/Irkutsk', 'Иркутск'],
  ['Asia/Yakutsk', 'Якутск'],
  ['Asia/Vladivostok', 'Владивосток'],
  ['Asia/Magadan', 'Магадан'],
  ['Asia/Kamchatka', 'Камчатка'],
  ['Asia/Almaty', 'Алматы'],
  ['Asia/Tashkent', 'Ташкент'],
  ['Asia/Baku', 'Баку'],
] as const;

export function defaultTimeZone(): string {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return TIMEZONES.some((item) => item[0] === detected) ? detected : 'Europe/Moscow';
}
