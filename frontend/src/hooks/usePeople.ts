import { useState, useCallback } from 'react';
import { peopleService } from '../services/authService';
import { Person, PeopleListResponse } from '../types';

export const usePeople = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchPeople = useCallback(
    async (search?: string, battalion?: string, page = 1, limit = 20) => {
      try {
        setLoading(true);
        setError(null);
        const result: PeopleListResponse = await peopleService.getPeople(
          search,
          battalion,
          page,
          limit
        );
        setPeople(result.data);
        setTotal(result.total);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch people');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchPersonById = useCallback(async (id: number): Promise<Person | null> => {
    try {
      setLoading(true);
      setError(null);
      const person = await peopleService.getPersonById(id);
      return person;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch person');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPerson = useCallback(
    async (
      firstName: string,
      lastName: string,
      battalion: string,
      email?: string,
      phone?: string
    ): Promise<Person | null> => {
      try {
        setLoading(true);
        setError(null);
        const newPerson = await peopleService.createPerson(
          firstName,
          lastName,
          battalion,
          email,
          phone
        );
        setPeople((prev) => [newPerson, ...prev]);
        return newPerson;
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to create person');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updatePerson = useCallback(
    async (
      id: number,
      firstName?: string,
      lastName?: string,
      battalion?: string,
      email?: string,
      phone?: string
    ): Promise<Person | null> => {
      try {
        setLoading(true);
        setError(null);
        const updated = await peopleService.updatePerson(
          id,
          firstName,
          lastName,
          battalion,
          email,
          phone
        );
        setPeople((prev) =>
          prev.map((p) => (p.id === id ? updated : p))
        );
        return updated;
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to update person');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deletePerson = useCallback(async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await peopleService.deletePerson(id);
      setPeople((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete person');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    people,
    loading,
    error,
    total,
    fetchPeople,
    fetchPersonById,
    createPerson,
    updatePerson,
    deletePerson,
  };
};
