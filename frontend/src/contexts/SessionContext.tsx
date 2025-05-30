import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@/types";
import { useSocket } from "./SocketContext";
import { toast } from "react-hot-toast";
import { api } from "@/utils/api";

interface SessionContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  updateUserSession: (userData: User | null, token: string | null) => void;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  updateUserSession: () => {},
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem("userToken");

      if (token) {
        try {
          const fetchedUser = await api.auth.getMe(token);
          setUser(fetchedUser);
          setIsAuthenticated(true);
          localStorage.setItem("userData", JSON.stringify(fetchedUser));
          console.log("SessionContext: User data refreshed from backend.");
        } catch (error) {
          console.error(
            "SessionContext: Error fetching user data with token:",
            error
          );
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem("userToken");
          localStorage.removeItem("userData");
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("userData");
      }
      setLoading(false);
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userToken" || e.key === "userData") {
        console.log("SessionContext: Storage changed, re-checking auth...");
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (socket && isConnected && isAuthenticated && user?.id) {
      console.log(
        `🚀 Emitting register_user for user ${user.id} with socket ${socket.id}`
      );
      socket.emit("register_user", user.id);
    }
  }, [socket, isConnected, isAuthenticated, user]);

  useEffect(() => {
    if (socket && isConnected && isAuthenticated && user) {
      const handleArtistStatusUpdate = (data: {
        status: string;
        message: string;
        artistProfile?: any;
      }) => {
        console.log("Received artist_status_updated:", data);
        toast.success(data.message);

        setUser((currentUser) => {
          if (!currentUser) return null;

          let updatedUser: User | null = null;

          if (data.status === "approved") {
            updatedUser = {
              ...currentUser,
              artistProfile: data.artistProfile || {
                ...currentUser.artistProfile,
                isVerified: true,
              },
              hasPendingArtistRequest: false,
            };
          } else if (data.status === "rejected") {
            const { artistProfile, hasPendingArtistRequest, ...restOfUser } =
              currentUser;
            updatedUser = {
              ...restOfUser,
              hasPendingArtistRequest: false,
            };
          }

          if (updatedUser) {
            try {
              localStorage.setItem("userData", JSON.stringify(updatedUser));
              console.log(
                "User data updated in localStorage after socket event (status update)."
              );
            } catch (error) {
              console.error(
                "Failed to save updated user data to localStorage:",
                error
              );
            }
          } else {
            localStorage.removeItem("userData");
          }

          return updatedUser;
        });
      };

      const handleArtistRequestSubmitted = (data: {
        hasPendingRequest: boolean;
      }) => {
        console.log("Received artist_request_submitted:", data);
        if (data.hasPendingRequest) {
          setUser((currentUser) => {
            if (!currentUser) return null;
            const updatedUser = {
              ...currentUser,
              hasPendingArtistRequest: true,
            };
            try {
              localStorage.setItem("userData", JSON.stringify(updatedUser));
              console.log(
                "User data updated in localStorage after socket event (request submitted)."
              );
            } catch (error) {
              console.error(
                "Failed to save updated user data to localStorage:",
                error
              );
            }
            return updatedUser;
          });
        }
      };

      console.log(
        "👂 Listening for artist_status_updated and artist_request_submitted..."
      );
      socket.on("artist_status_updated", handleArtistStatusUpdate);
      socket.on("artist_request_submitted", handleArtistRequestSubmitted);

      const handleProfileUpdate = (updatedUser: User) => {
        console.log("Received profile_updated event:", updatedUser);
        setUser((currentUser) => {
          if (!currentUser || currentUser.id !== updatedUser.id)
            return currentUser;
          const mergedUser = { ...currentUser, ...updatedUser };
          try {
            localStorage.setItem("userData", JSON.stringify(mergedUser));
            console.log(
              "User data updated in localStorage after profile_updated event."
            );
          } catch (error) {
            console.error(
              "Failed to save updated user data to localStorage after profile_updated:",
              error
            );
          }
          return mergedUser;
        });
      };

      socket.on("profile_updated", handleProfileUpdate);

      return () => {
        console.log("🚫 Stopping listening for socket events.");
        socket.off("artist_status_updated", handleArtistStatusUpdate);
        socket.off("artist_request_submitted", handleArtistRequestSubmitted);
        socket.off("profile_updated", handleProfileUpdate);
      };
    }
  }, [socket, isConnected, isAuthenticated, user]);

  const updateUserSession = (userData: User | null, token: string | null) => {
    setLoading(true);
    if (userData && token) {
      try {
        localStorage.setItem("userData", JSON.stringify(userData));
        localStorage.setItem("userToken", token);
        setUser(userData);
        setIsAuthenticated(true);
        console.log("Session updated: User logged in.");
      } catch (error) {
        console.error("Failed to save user data during session update:", error);
        localStorage.removeItem("userData");
        localStorage.removeItem("userToken");
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      localStorage.removeItem("userData");
      localStorage.removeItem("userToken");
      setUser(null);
      setIsAuthenticated(false);
      console.log("Session cleared: User logged out.");
    }
    setLoading(false);
  };

  return (
    <SessionContext.Provider
      value={{ user, isAuthenticated, loading, updateUserSession }}
    >
      {children}
    </SessionContext.Provider>
  );
};
