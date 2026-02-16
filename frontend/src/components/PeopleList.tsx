import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePeople } from '../hooks/usePeople';
import { Person } from '../types';

export const PeopleList: React.FC = () => {
  const { people, loading, error, total, fetchPeople, deletePerson } = usePeople();
  const [search, setSearch] = useState('');
  const [battalion, setBattalion] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);

  const limit = 10;

  useEffect(() => {
    fetchPeople(search, battalion, page, limit);
  }, [search, battalion, page]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this person?')) return;

    setDeleting(id);
    const success = await deletePerson(id);
    setDeleting(null);

    if (success) {
      setPage(1);
      await fetchPeople(search, battalion, 1, limit);
    }
  };

  const battalions = Array.from(new Set(people.map((p) => p.battalion)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
          />
        </div>
        <select
          value={battalion}
          onChange={(e) => {
            setBattalion(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
        >
          <option value="">All Battalions</option>
          {battalions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <Link
          to="/people/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
        >
          + New Person
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/40 border border-red-700 p-4">
          <p className="text-sm font-medium text-red-300">{error}</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading...</p>
        </div>
      )}

      {!loading && people.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No people found</p>
        </div>
      )}

      {!loading && people.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Battalion
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {people.map((person: Person) => (
                  <tr key={person.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-white">
                      {person.firstName} {person.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {person.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {person.battalion}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {person.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm space-x-2">
                      <Link
                        to={`/people/${person.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(person.id)}
                        disabled={deleting === person.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleting === person.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, total)} of {total} results
            </p>
            <div className="space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * limit >= total}
                className="px-4 py-2 border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
