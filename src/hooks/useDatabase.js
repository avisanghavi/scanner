import { useState, useEffect } from 'react';
import { initDB, insertScan, getAllScans, insertEvent, getAllEvents, getEventById, getScansByEventId, updateEventById, migrateDatabase } from '../utils/db';

export const useDatabase = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [scans, setScans] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentEventScans, setCurrentEventScans] = useState([]);

  // Initialize database on mount
  useEffect(() => {
    initializeDB();
  }, []);

  const initializeDB = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await initDB();
      await migrateDatabase();
      await loadEvents();
      await loadScans();
    } catch (err) {
      console.error('Database initialization error:', err);
      setError('Failed to initialize database: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setError(null);
      const allEvents = await getAllEvents();
      console.log('Loaded events:', allEvents);
      setEvents(allEvents || []);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events: ' + err.message);
    }
  };

  const loadScans = async () => {
    try {
      setError(null);
      const allScans = await getAllScans();
      console.log('Loaded scans:', allScans);
      setScans(allScans || []);
    } catch (err) {
      console.error('Failed to load scans:', err);
      setError('Failed to load scans: ' + err.message);
    }
  };

  const addScan = async (scanData) => {
    try {
      setError(null);
      console.log('Adding scan:', scanData);
      const scanId = await insertScan(scanData);
      console.log('Scan added with ID:', scanId);
      await loadScans(); // Refresh scans list
      return scanId;
    } catch (err) {
      console.error('Failed to save scan:', err);
      setError('Failed to save scan: ' + err.message);
      throw err;
    }
  };

  const addEvent = async (eventData) => {
    try {
      setError(null);
      console.log('Adding event:', eventData);
      const eventId = await insertEvent(eventData);
      console.log('Event added with ID:', eventId);
      await loadEvents(); // Refresh events list
      return eventId;
    } catch (err) {
      console.error('Failed to create event:', err);
      setError('Failed to create event: ' + err.message);
      throw err;
    }
  };

  const updateEvent = async (eventId, eventData) => {
    try {
      setError(null);
      console.log('Updating event:', { eventId, eventData });
      await updateEventById(eventId, eventData);
      console.log('Event updated successfully');
      await loadEvents(); // Refresh events list
    } catch (err) {
      console.error('Failed to update event:', err);
      setError('Failed to update event: ' + err.message);
      throw err;
    }
  };

  const loadEventDetails = async (eventId) => {
    try {
      setError(null);
      console.log('Loading event details for ID:', eventId);
      const event = await getEventById(eventId);
      console.log('Event details:', event);
      
      const eventScans = await getScansByEventId(eventId);
      console.log('Event scans:', eventScans);
      
      setCurrentEvent(event);
      setCurrentEventScans(eventScans || []);
      return { event, scans: eventScans };
    } catch (err) {
      console.error('Failed to load event details:', err);
      setError('Failed to load event details: ' + err.message);
      throw err;
    }
  };

  const clearCurrentEvent = () => {
    setCurrentEvent(null);
    setCurrentEventScans([]);
  };

  return {
    // State
    isLoading,
    error,
    events,
    scans,
    currentEvent,
    currentEventScans,
    
    // Actions
    initializeDB,
    addScan,
    addEvent,
    updateEvent,
    loadEventDetails,
    clearCurrentEvent,
    loadEvents,
    loadScans,
  };
}; 