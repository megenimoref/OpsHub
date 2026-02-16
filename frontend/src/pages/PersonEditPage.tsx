import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonForm } from '../components/PersonForm';

export const PersonEditPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-6">עריכת איש קשר</h1>
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <PersonForm onSuccess={() => navigate('/people')} />
      </div>
    </div>
  );
};
