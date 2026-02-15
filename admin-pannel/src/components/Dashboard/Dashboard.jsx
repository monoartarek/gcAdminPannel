import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const stats = [
    { title: 'Registered Today', value: '124', icon: '👤', color: '#4e73df' },
    { title: 'Total Users', value: '45,210', icon: '👥', color: '#1cc88a' },
    { title: 'Messages', value: '892', icon: '📩', color: '#36b9cc' },
    { title: 'Videos', value: '1,205', icon: '🎥', color: '#f6c23e' },
    { title: 'Streamings', value: '42', icon: '📡', color: '#e74a3b' },
    { title: 'Challenges', value: '15', icon: '🏆', color: '#858796' },
    { title: 'Categories', value: '24', icon: '📁', color: '#5a5c69' },
    { title: 'Stories', value: '3,420', icon: '📱', color: '#6610f2' },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back! Here is what's happening today.</p>
      </header>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div 
            className="stat-card" 
            key={index} 
            style={{ '--accent-color': stat.color, animationDelay: `${index * 0.1}s` }}
          >
            <div className="card-body">
              <div className="text-section">
                <p className="stat-title">{stat.title}</p>
                <h2 className="stat-value">{stat.value}</h2>
              </div>
              <div className="icon-section" style={{ backgroundColor: stat.color }}>
                {stat.icon}
              </div>
            </div>
            <div className="card-footer">
              <span className="trend positive">↑ 12%</span> since yesterday
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;