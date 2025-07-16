import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    console.log('DEBUG: Attempting login with:', form);
    const res = await login(form.username, form.password);
    console.log('DEBUG: Login response:', res);
    if (res.success) navigate('/admin');
    else alert(res.error || 'Login failed');
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '80px auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>Admin Login</h2>
      <input 
        name="username" 
        value={form.username} 
        onChange={handleChange} 
        placeholder="Username" 
        autoFocus 
        required 
        autocomplete="username"
      />
      <input 
        name="password" 
        type="password" 
        value={form.password} 
        onChange={handleChange} 
        placeholder="Password" 
        required 
        autocomplete="current-password"
      />
      <button type="submit">Login</button>
    </form>
  );
};

export default AdminLogin; 