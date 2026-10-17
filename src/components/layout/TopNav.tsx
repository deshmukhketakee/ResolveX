
import React, { useState } from 'react';
import type { UserRole } from '@/types/roles';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import { Search, Bell, Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface TopNavProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onToggleSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentRole,
  onToggleSidebar,
}) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  const roleDisplayNames: Record<UserRole, string> = {
    customer: 'Customer Dashboard',
    agent: 'Support Agent Console',
    admin: 'Admin Management Hub',
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const displayName =
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const handleSearch = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const query = searchText.trim();

    if (!query) {
      setSearchMessage('Please enter a ticket number or complaint text.');
      return;
    }

    if (!user) {
      setSearchMessage('Please log in before searching.');
      return;
    }

    setSearching(true);
    setSearchMessage('');

    try {
      /*
       * Search by ticket number first.
       */
      const { data: ticketData, error: ticketError } = await supabase
        .from('complaints')
        .select('id, ticket_number, subject, customer_id, assigned_agent_id')
        .ilike('ticket_number', query)
        .limit(1)
        .maybeSingle();

      if (ticketError) {
        console.error('Ticket search failed:', ticketError);
        setSearchMessage('Unable to search complaints right now.');
        return;
      }

      let complaint = ticketData;

      /*
       * If exact ticket number was not found,
       * search by subject text.
       */
      if (!complaint) {
        const { data: subjectData, error: subjectError } =
          await supabase
            .from('complaints')
            .select(
              'id, ticket_number, subject, customer_id, assigned_agent_id'
            )
            .ilike('subject', `%${query}%`)
            .limit(1)
            .maybeSingle();

        if (subjectError) {
          console.error(
            'Subject search failed:',
            subjectError
          );

          setSearchMessage(
            'Unable to search complaints right now.'
          );

          return;
        }

        complaint = subjectData;
      }

      if (!complaint) {
        setSearchMessage(
          `No complaint found for "${query}".`
        );

        return;
      }

      /*
       * Customer:
       * only allow opening their own complaint.
       */
      if (currentRole === 'customer') {
        if (complaint.customer_id !== user.id) {
          setSearchMessage(
            'This ticket does not belong to your account.'
          );

          return;
        }

        navigate(
          `/customer/complaints?ticket=${encodeURIComponent(
            complaint.ticket_number
          )}`
        );

        setSearchText('');
        return;
      }

      /*
       * Agent:
       * only allow opening a complaint assigned to them.
       */
      if (currentRole === 'agent') {
        if (complaint.assigned_agent_id !== user.id) {
          setSearchMessage(
            'This ticket is not assigned to you.'
          );

          return;
        }

        navigate(
          `/agent/investigation?ticket=${encodeURIComponent(
            complaint.ticket_number
          )}`
        );

        setSearchText('');
        return;
      }

      /*
       * Admin:
       * admin can search any complaint.
       */
      if (currentRole === 'admin') {
        navigate(
          `/admin/dashboard?ticket=${encodeURIComponent(
            complaint.ticket_number
          )}`
        );

        setSearchText('');
        return;
      }
    } catch (error) {
      console.error('Search failed:', error);

      setSearchMessage(
        'Something went wrong while searching.'
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 shadow-2xs">

      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer md:hidden"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            {roleDisplayNames[currentRole]}
          </h1>

          <p className="text-xs text-slate-500 hidden sm:block">
            Smart Customer Complaint & Resolution Platform
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 sm:gap-4">

        {/* Search */}
        <div className="relative hidden lg:block w-64">
          <form onSubmit={handleSearch}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

            <input
              type="text"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setSearchMessage('');
              }}
              placeholder="Search tickets, IDs..."
              disabled={searching}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-60"
            />
          </form>

          {searchMessage && (
            <div className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
              <p className="text-xs text-slate-600">
                {searchMessage}
              </p>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Notifications */}
        <button
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />

          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
        </button>

        {/* Real user profile */}
        <div className="flex items-center gap-2.5 pl-1">

          <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
            {initials || 'U'}
          </div>

          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              {displayName}
            </span>

            <span className="text-[10px] text-slate-500 capitalize">
              {profile?.role || currentRole}
            </span>
          </div>

        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />

          <span className="hidden sm:inline">
            Logout
          </span>
        </button>

      </div>
    </header>
  );
};