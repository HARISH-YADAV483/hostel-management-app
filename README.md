# Hostel Management System

A comprehensive web application for managing hostel operations including student management, complaints, mess facilities, announcements, and real-time chat.

## Features

- **Student Management**: Registration, login, and profile management
- **Complaint System**: Submit and track complaints with status updates
- **Mess Management**: Menu display and mess facility information
- **Announcements**: View important announcements and notifications
- **Real-time Chat**: Socket.io powered chat system for residents
- **File Uploads**: Support for document and image uploads
- **Responsive Design**: Mobile-friendly interface

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: HTML, CSS, JavaScript, EJS templating
- **Real-time**: Socket.io
- **Authentication**: Express-session with bcrypt
- **File Handling**: Multer
- **Deployment**: Vercel ready

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hostel-management-system.git
cd hostel-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server:
```bash
npm start
```

## Environment Variables

Create a `.env` file with the following variables:

```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
EMAIL_HOST=your_email_host
EMAIL_PORT=your_email_port
EMAIL_USER=your_email_username
EMAIL_PASS=your_email_password
```

## Project Structure

```
├── app.js                 # Main application file
├── models/                # Database models
│   ├── User.js
│   ├── Complaint.js
│   └── Record.js
├── views/                 # EJS templates
│   ├── index.html
│   ├── login.html
│   ├── chatroom.html
│   ├── complaint.html
│   └── ...
├── public/                # Static assets
│   ├── css/
│   ├── js/
│   └── images/
├── data/                  # JSON data files
├── uploads/               # File uploads
└── package.json
```

## Usage

1. **Student Registration**: Students can register and create profiles
2. **Login**: Secure authentication system
3. **Complaints**: Submit and track complaint status
4. **Mess**: View mess menu and facilities
5. **Chat**: Real-time communication with other residents
6. **Announcements**: Stay updated with latest news

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC License

## Author

Created for hostel management needs
