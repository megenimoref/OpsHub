import React from 'react';
import { PeopleList } from '../components/PeopleList';

export const PeoplePage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">אנשי קשר</h1>
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <PeopleList />
      </div>
    </div>
  );
};
