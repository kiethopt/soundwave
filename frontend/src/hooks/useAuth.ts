import { useState, useCallback, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check if the user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    setIsAuthenticated(!!token);
  }, []);

  // Function to open the dialog
  const showAuthDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  // Function to handle protected actions
  const handleProtectedAction = useCallback((callback?: () => void) => {
    const token = localStorage.getItem('userToken');

    if (token) {
      // User is authenticated, perform the action
      if (callback) callback();
      return true;
    } else {
      // User is not authenticated, show the dialog
      setDialogOpen(true);
      return false;
    }
  }, []);

  return {
    isAuthenticated,
    dialogOpen,
    setDialogOpen,
    showAuthDialog,
    handleProtectedAction,
  };
};
