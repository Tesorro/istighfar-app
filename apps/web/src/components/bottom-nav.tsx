import { CalendarDays, House, UserRound } from 'lucide-react';
import { NavLink } from 'react-router';

const items = [
  { to: '/', label: 'Главная', icon: House, end: true },
  { to: '/history', label: 'История', icon: CalendarDays, end: false },
  { to: '/profile', label: 'Профиль', icon: UserRound, end: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Основное меню"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line/80 bg-card/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
            >
              <item.icon aria-hidden="true" size={20} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
