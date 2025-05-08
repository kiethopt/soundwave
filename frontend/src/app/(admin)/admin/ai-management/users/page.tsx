"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { User } from "@/types";
import { api } from "@/utils/api";
import toast from "react-hot-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Bot,
  Loader2,
} from "lucide-react";
import { UserInfoModal } from "@/components/ui/data-table/data-table-modals";
import {
  EditUserModal,
  ConfirmDeleteModal,
} from "@/components/ui/admin-modals";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation"; // Import useRouter

interface SortConfig {
  key: keyof User | null;
  direction: "asc" | "desc";
}

export default function AiUserManagementPage() {
  // Renamed component
  const { theme } = useTheme();
  const router = useRouter(); // Initialize useRouter
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "createdAt",
    direction: "desc",
  });
  const limit = 10;

  const fetchUsers = useCallback(
    async (
      page: number,
      search: string,
      role: "ALL" | "ADMIN" | "USER",
      status: "ALL" | "ACTIVE" | "INACTIVE",
      sort: SortConfig
    ) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("userToken");
        if (!token) {
          throw new Error("No authentication token found");
        }
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (search) {
          params.append("search", search);
        }
        if (role !== "ALL") {
          params.append("role", role);
        }
        if (status !== "ALL") {
          params.append("status", status === "ACTIVE" ? "true" : "false");
        }
        if (sort.key) {
          params.append("sortBy", sort.key);
          params.append("sortOrder", sort.direction);
        }

        const response = await api.admin.getAllUsers(
          token,
          page,
          limit,
          params.toString()
        );
        setUsers(response.users || []);
        setTotalPages(response.pagination?.totalPages || 1);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.message || "Could not load users");
        toast.error(err.message || "Could not load users");
        setUsers([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  const refreshTable = useCallback(() => {
    fetchUsers(
      currentPage,
      activeSearchTerm,
      roleFilter,
      statusFilter,
      sortConfig
    );
    setSelectedUserIds(new Set());
  }, [
    currentPage,
    activeSearchTerm,
    roleFilter,
    statusFilter,
    sortConfig,
    fetchUsers,
  ]);

  useEffect(() => {
    refreshTable();
  }, [refreshTable]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, roleFilter, statusFilter, sortConfig]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const handleSort = (key: keyof User | null) => {
    if (!key) return;
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      const allIds = new Set(users.map((u) => u.id));
      setSelectedUserIds(allIds);
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectRow = (
    userId: string,
    checked: boolean | "indeterminate"
  ) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GB");
    } catch {
      return "Invalid Date";
    }
  };

  const handleAction = (action: string, user: User) => {
    if (action === "view") {
      // Navigate to the AI management user detail page
      router.push(`/admin/ai-management/users/${user.id}`);
    } else if (action === "edit") {
      setEditingUser(user);
      setIsEditModalOpen(true);
    } else if (action === "delete") {
      setDeletingUser(user);
      setIsBulkDeleteConfirm(false);
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = (ids: string[]) => {
    if (ids.length === 0 && isBulkDeleteConfirm) {
      handleBulkDeleteConfirm(Array.from(selectedUserIds));
    } else if (ids.length === 1 && !isBulkDeleteConfirm && deletingUser) {
      handleSingleDeleteConfirm(ids[0]);
    } else {
      console.error("Inconsistent state in handleDeleteConfirm");
    }
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
    setIsBulkDeleteConfirm(false);
  };

  const handleSingleDeleteConfirm = async (userId: string) => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.error("Authentication required.");
      return;
    }
    setActionLoading(userId);
    try {
      await api.admin.deleteUser(userId, token);
      toast.success(`Successfully deleted user.`);
      refreshTable();
      setSelectedUserIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err: any) {
      console.error("Error deleting user:", err);
      toast.error(err.message || "Failed to delete user.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUserSubmit = async (
    userId: string,
    editFormData: FormData
  ) => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.error("Authentication required.");
      return;
    }
    setActionLoading(userId);
    try {
      // Assuming FormData type from types/index.ts is compatible or adjust as needed
      // For now, we cast to 'any' to bypass strict type checking if FormData here is different
      await api.admin.updateUser(userId, editFormData as any, token);
      toast.success("User updated successfully!");
      setIsEditModalOpen(false);
      setEditingUser(null);
      refreshTable();
    } catch (err: any) {
      console.error("Error updating user:", err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("An unexpected error occurred while updating the user.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedUserIds.size === 0) {
      toast("No users selected.", { icon: "⚠️" });
      return;
    }
    setDeletingUser(null);
    setIsBulkDeleteConfirm(true);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async (userIds: string[]) => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.error("Authentication required.");
      return;
    }
    setActionLoading("bulk-delete");
    try {
      await Promise.all(userIds.map((id) => api.admin.deleteUser(id, token)));
      toast.success(`Successfully deleted ${userIds.length} user(s).`);

      const response = await api.admin.getAllUsers(
        token,
        1,
        limit,
        new URLSearchParams({ limit: "1" }).toString()
      );
      const newTotalUsers = response.pagination?.totalItems || 0;
      const newTotalPages = Math.ceil(newTotalUsers / limit) || 1;

      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (newTotalUsers === 0) {
        setCurrentPage(1); // Reset to page 1 if no users left
      }
      // Trigger a refresh after state update or rely on existing refreshTable if currentPage change triggers it
      refreshTable();
      setSelectedUserIds(new Set()); // Clear selection
    } catch (err: any) {
      console.error("Error during bulk delete:", err);
      toast.error(err.message || "Failed to delete selected users.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (
    user: User,
    e: React.MouseEvent<HTMLTableRowElement>
  ) => {
    // Prevent navigation if clicking on interactive elements within the row
    const target = e.target as HTMLElement;
    if (
      target.closest('button, input[type="checkbox"], a, [role="menuitem"]')
    ) {
      return;
    }
    router.push(`/admin/ai-management/users/${user.id}`);
  };

  const renderSortIcon = (key: keyof User | null) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    );
  };

  return (
    <div
      className={`container mx-auto px-4 py-8 ${
        theme === "dark" ? "text-white" : "text-gray-900"
      }`}
    >
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <Bot className="mr-3 h-8 w-8 text-primary" /> User AI Playlist
          Management
        </h1>
        {/* Add any specific buttons for this page, e.g., "Create User with AI Playlist" if needed */}
      </div>

      {/* Filters and Search */}
      <div className="mb-6 p-4 rounded-lg shadow-md bg-card border">
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div className="md:col-span-2">
            <label
              htmlFor="search-users"
              className="block text-sm font-medium mb-1"
            >
              Search Users
            </label>
            <div className="relative">
              <Input
                id="search-users"
                type="text"
                placeholder="Search by name, email, username..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pr-10"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label
              htmlFor="role-filter"
              className="block text-sm font-medium mb-1"
            >
              Filter by Role
            </label>
            <Select
              value={roleFilter}
              onValueChange={(value: "ALL" | "ADMIN" | "USER") =>
                setRoleFilter(value)
              }
            >
              <SelectTrigger id="role-filter">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              htmlFor="status-filter"
              className="block text-sm font-medium mb-1"
            >
              Filter by Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(value: "ALL" | "ACTIVE" | "INACTIVE") =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      </div>

      {/* Bulk Actions - kept for consistency, review if needed for AI context */}
      {selectedUserIds.size > 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-muted rounded-md border">
          <p className="text-sm font-medium">
            {selectedUserIds.size} user(s) selected.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDeleteClick}
            disabled={actionLoading === "bulk-delete"}
          >
            {actionLoading === "bulk-delete" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Selected
          </Button>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-lg border shadow-md">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left w-10">
                <Checkbox
                  checked={
                    selectedUserIds.size === users.length && users.length > 0
                      ? true
                      : selectedUserIds.size > 0
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all users"
                />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-muted"
                onClick={() => handleSort("name")}
              >
                Name {renderSortIcon("name")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-muted"
                onClick={() => handleSort("email")}
              >
                Email {renderSortIcon("email")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-muted"
                onClick={() => handleSort("role")}
              >
                Role {renderSortIcon("role")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-muted"
                onClick={() => handleSort("isActive")}
              >
                Status {renderSortIcon("isActive")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-muted"
                onClick={() => handleSort("createdAt")}
              >
                Joined {renderSortIcon("createdAt")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {loading && users.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <span>Loading users...</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No users found matching your criteria.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={(e) => handleRowClick(user, e)}
                className="hover:bg-muted/50 cursor-pointer group"
                aria-selected={selectedUserIds.has(user.id)}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedUserIds.has(user.id)}
                    onCheckedChange={(checked) =>
                      handleSelectRow(user.id, checked)
                    }
                    aria-labelledby={`user-name-${user.id}`}
                    onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={user.avatar || "/images/default-avatar.png"}
                        alt={user.name || user.username || "User"}
                      />
                    </div>
                    <div className="ml-3">
                      <div
                        id={`user-name-${user.id}`}
                        className="text-sm font-semibold group-hover:text-primary transition-colors"
                      >
                        {user.name || user.username || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.username || "-"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                  {user.email}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      user.role === "ADMIN"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    title="View User Details & AI Playlists"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("view", user);
                    }}
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                    title="Edit User"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("edit", user);
                    }}
                  >
                    {actionLoading === user.id &&
                    editingUser?.id === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Edit className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Delete User"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("delete", user);
                    }}
                    disabled={actionLoading === user.id}
                  >
                    {actionLoading === user.id &&
                    deletingUser?.id === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      {viewingUser && (
        <UserInfoModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={handleEditUserSubmit}
        />
      )}
      {isDeleteModalOpen && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingUser(null);
            setIsBulkDeleteConfirm(false);
          }}
          onConfirm={() =>
            handleDeleteConfirm(
              isBulkDeleteConfirm && selectedUserIds.size > 0
                ? Array.from(selectedUserIds)
                : deletingUser
                ? [deletingUser.id]
                : []
            )
          }
          item={
            deletingUser
              ? {
                  id: deletingUser.id,
                  name: deletingUser.name || deletingUser.username || "user",
                  email: deletingUser.email,
                }
              : {
                  id: "bulk-delete-users",
                  name: `${selectedUserIds.size} user(s)`,
                  email: "",
                }
          }
        />
      )}
    </div>
  );
}
