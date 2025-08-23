import React from 'react';
import { 
  FaHeart, 
  FaCalendarAlt, 
  FaUser, 
  FaUserMd, 
  FaHospital, 
  FaPills, 
  FaChartBar, 
  FaCalendar,
  FaUsers,
  FaClock,
  FaFileAlt,
  FaVideo,
  FaComments,
  FaDollarSign,
  FaStar,
  FaEye,
  FaEdit,
  FaSearch,
  FaLock,
  FaTrophy,
  FaDownload,
  FaUpload,
  FaPlus
} from 'react-icons/fa';
import './Icons.css';

// Common icons used throughout the application
export const HeartIcon = () => <FaHeart className="icon" />;
export const CalendarIcon = () => <FaCalendarAlt className="icon" />;
export const UserIcon = () => <FaUser className="icon" />;
export const DoctorIcon = () => <FaUserMd className="icon" />;
export const MedicalIcon = () => <FaHospital className="icon" />;
export const PrescriptionIcon = () => <FaPills className="icon" />;
export const AnalyticsIcon = () => <FaChartBar className="icon" />;
export const AppointmentIcon = () => <FaCalendar className="icon" />;

// Additional icons for compatibility
export const CalendarOutlined = () => <FaCalendarAlt className="icon" />;
export const TeamOutlined = () => <FaUsers className="icon" />;
export const ClockCircleOutlined = () => <FaClock className="icon" />;
export const FileTextOutlined = () => <FaFileAlt className="icon" />;
export const MedicineBoxOutlined = () => <FaPills className="icon" />;
export const BarChartOutlined = () => <FaChartBar className="icon" />;
export const VideoCameraOutlined = () => <FaVideo className="icon" />;
export const MessageOutlined = () => <FaComments className="icon" />;
export const DollarOutlined = () => <FaDollarSign className="icon" />;
export const StarOutlined = () => <FaStar className="icon" />;
export const UserOutlined = () => <FaUser className="icon" />;
export const EyeOutlined = () => <FaEye className="icon" />;
export const EditOutlined = () => <FaEdit className="icon" />;
export const SearchOutlined = () => <FaSearch className="icon" />;
export const LockOutlined = () => <FaLock className="icon" />;
export const TrophyOutlined = () => <FaTrophy className="icon" />;
export const DownloadOutlined = () => <FaDownload className="icon" />;
export const UploadOutlined = () => <FaUpload className="icon" />;
export const PlusOutlined = () => <FaPlus className="icon" />;

const Icons = {
  HeartIcon,
  CalendarIcon,
  UserIcon,
  DoctorIcon,
  MedicalIcon,
  PrescriptionIcon,
  AnalyticsIcon,
  AppointmentIcon,
  CalendarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  BarChartOutlined,
  VideoCameraOutlined,
  MessageOutlined,
  DollarOutlined,
  StarOutlined,
  UserOutlined,
  EyeOutlined,
  EditOutlined,
  SearchOutlined,
  LockOutlined,
  TrophyOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined
};

export default Icons;
