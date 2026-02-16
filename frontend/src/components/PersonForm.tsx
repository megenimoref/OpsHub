import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePeople } from '../hooks/usePeople';

export const PersonForm: React.FC<{
  onSuccess?: () => void;
}> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { createPerson, updatePerson, loading, error, fetchPersonById } =
    usePeople();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    battalion: '',
  });

  const [validationError, setValidationError] = useState('');

  React.useEffect(() => {
    if (id) {
      loadPerson();
    }
  }, [id]);

  const loadPerson = async () => {
    const person = await fetchPersonById(parseInt(id!));
    if (person) {
      setFormData({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email || '',
        phone: person.phone || '',
        battalion: person.battalion,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    if (!formData.firstName.trim()) {
      setValidationError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setValidationError('Last name is required');
      return false;
    }
    if (!formData.battalion.trim()) {
      setValidationError('Battalion is required');
      return false;
    }
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setValidationError('Invalid email format');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!validate()) return;

    try {
      if (id) {
        await updatePerson(
          parseInt(id),
          formData.firstName,
          formData.lastName,
          formData.battalion,
          formData.email || undefined,
          formData.phone || undefined
        );
      } else {
        await createPerson(
          formData.firstName,
          formData.lastName,
          formData.battalion,
          formData.email || undefined,
          formData.phone || undefined
        );
      }
      onSuccess?.();
      navigate('/people');
    } catch (err) {
      setValidationError('Failed to save person');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || validationError) && (
        <div className="rounded-md bg-red-900/40 border border-red-700 p-4">
          <p className="text-sm font-medium text-red-300">
            {validationError || error}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-300">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
            required
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-300">
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
            required
          />
        </div>

        <div>
          <label htmlFor="battalion" className="block text-sm font-medium text-gray-300">
            Battalion *
          </label>
          <input
            type="text"
            id="battalion"
            name="battalion"
            value={formData.battalion}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => navigate('/people')}
          className="inline-flex justify-center py-2 px-4 border border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};
