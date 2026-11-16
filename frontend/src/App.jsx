import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PlaceholderPage from './pages/PlaceholderPage';
import UserList from './pages/UserList';
import RoleManagement from './pages/RoleManagement';
import BookList from './pages/BookList';
import BookForm from './pages/BookForm';
import BookDetail from './pages/BookDetail';
import CategoryList from './pages/CategoryList';
import MyBorrows from './pages/MyBorrows';
import BorrowAudit from './pages/BorrowAudit';
import BorrowLendReturn from './pages/BorrowLendReturn';
import Notifications from './pages/Notifications';
import OverdueList from './pages/OverdueList';
import Statistics from './pages/Statistics';
import { ROLES } from './utils/menu';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="books/new" element={<BookForm />} />
            <Route path="books/edit/:id" element={<BookForm />} />
            <Route path="books/:id" element={<BookDetail />} />
            <Route path="books" element={<BookList />} />
            <Route
              path="book-management"
              element={
                <RoleRoute allowedRoles={[ROLES.LIBRARIAN, ROLES.ADMIN]}>
                  <BookList />
                </RoleRoute>
              }
            />
            <Route path="my-borrowings" element={<MyBorrows />} />
            <Route path="notifications" element={<Notifications />} />
            <Route
              path="categories"
              element={
                <RoleRoute allowedRoles={[ROLES.LIBRARIAN, ROLES.ADMIN]}>
                  <CategoryList />
                </RoleRoute>
              }
            />
            <Route
              path="borrow-review"
              element={
                <RoleRoute allowedRoles={[ROLES.LIBRARIAN, ROLES.ADMIN]}>
                  <BorrowAudit />
                </RoleRoute>
              }
            />
            <Route
              path="borrow-return"
              element={
                <RoleRoute allowedRoles={[ROLES.LIBRARIAN, ROLES.ADMIN]}>
                  <BorrowLendReturn />
                </RoleRoute>
              }
            />
            <Route
              path="overdue"
              element={
                <RoleRoute allowedRoles={[ROLES.LIBRARIAN, ROLES.ADMIN]}>
                  <OverdueList />
                </RoleRoute>
              }
            />
            <Route
              path="statistics"
              element={
                <RoleRoute allowedRoles={[ROLES.LIBRARIAN, ROLES.ADMIN]}>
                  <Statistics />
                </RoleRoute>
              }
            />
            <Route
              path="users"
              element={
                <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                  <UserList />
                </RoleRoute>
              }
            />
            <Route
              path="roles"
              element={
                <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                  <RoleManagement />
                </RoleRoute>
              }
            />
            <Route path="*" element={<PlaceholderPage title="页面不存在" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
