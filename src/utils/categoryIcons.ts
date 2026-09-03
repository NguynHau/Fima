import React from 'react';
import {
  UtensilsCrossed,
  Utensils,
  Coffee,
  Pizza,
  Wine,
  Beer,
  Sandwich,
  Apple,
  Cake,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Package,
  Tag,
  Gift,
  Watch,
  Home,
  Building,
  Building2,
  BedDouble,
  Key,
  Sparkles,
  Sofa,
  Lightbulb,
  Receipt,
  Car,
  Bus,
  Train,
  Bike,
  Fuel,
  Plane,
  Navigation,
  Ship,
  Zap,
  Droplets,
  Phone,
  Smartphone,
  Wifi,
  Globe,
  Tv,
  FileText,
  Flame,
  HeartPulse,
  Pill,
  Stethoscope,
  Dumbbell,
  Activity,
  GraduationCap,
  BookOpen,
  Pencil,
  School,
  Gamepad2,
  Film,
  Music,
  Compass,
  Camera,
  Ticket,
  Dog,
  Cat,
  Baby,
  User,
  Heart,
  Smile,
  CreditCard,
  Wallet,
  Banknote,
  Wrench,
  Hammer,
  Scissors,
  ShieldCheck,
  Briefcase,
  Award,
  Trophy,
  TrendingUp,
  LineChart,
  Store,
  Landmark,
  PiggyBank,
  RefreshCw,
  HandCoins,
  DollarSign,
  Coins,
  BadgePercent,
  MoreHorizontal,
  CircleDot,
  Star,
  CheckCircle,
} from 'lucide-react';

export interface IconDefinition {
  name: string;
  label: string;
  group: string;
  component: React.ComponentType<{ size?: number; color?: string; className?: string; strokeWidth?: number }>;
}

export const CATEGORY_ICON_DEFINITIONS: IconDefinition[] = [
  // Ăn uống
  { name: 'UtensilsCrossed', label: 'Ăn uống', group: 'Ẩm thực', component: UtensilsCrossed },
  { name: 'Utensils', label: 'Dao nĩa', group: 'Ẩm thực', component: Utensils },
  { name: 'Coffee', label: 'Cà phê / Trà', group: 'Ẩm thực', component: Coffee },
  { name: 'Pizza', label: 'Pizza / Đồ ăn nhanh', group: 'Ẩm thực', component: Pizza },
  { name: 'Sandwich', label: 'Bánh mì', group: 'Ẩm thực', component: Sandwich },
  { name: 'Cake', label: 'Bánh ngọt / Tráng miệng', group: 'Ẩm thực', component: Cake },
  { name: 'Apple', label: 'Trái cây / Rau quả', group: 'Ẩm thực', component: Apple },
  { name: 'Wine', label: 'Rượu / Tiệc tùng', group: 'Ẩm thực', component: Wine },
  { name: 'Beer', label: 'Bia / Quán bar', group: 'Ẩm thực', component: Beer },

  // Mua sắm & Đồ dùng
  { name: 'ShoppingBag', label: 'Mua sắm', group: 'Mua sắm', component: ShoppingBag },
  { name: 'ShoppingCart', label: 'Siêu thị', group: 'Mua sắm', component: ShoppingCart },
  { name: 'Shirt', label: 'Quần áo / Thời trang', group: 'Mua sắm', component: Shirt },
  { name: 'Package', label: 'Hàng hóa / Bưu kiện', group: 'Mua sắm', component: Package },
  { name: 'Tag', label: 'Giảm giá / Ưu đãi', group: 'Mua sắm', component: Tag },
  { name: 'Watch', label: 'Đồng hồ / Phụ kiện', group: 'Mua sắm', component: Watch },
  { name: 'Gift', label: 'Quà tặng', group: 'Mua sắm', component: Gift },

  // Nhà cửa & Tiện ích
  { name: 'Home', label: 'Nhà ở / Thuê nhà', group: 'Nhà ở & Tiện ích', component: Home },
  { name: 'Building', label: 'Căn hộ / Chung cư', group: 'Nhà ở & Tiện ích', component: Building },
  { name: 'Building2', label: 'Tòa nhà văn phòng', group: 'Nhà ở & Tiện ích', component: Building2 },
  { name: 'BedDouble', label: 'Nội thất / Phòng ngủ', group: 'Nhà ở & Tiện ích', component: BedDouble },
  { name: 'Sofa', label: 'Phòng khách / Bàn ghế', group: 'Nhà ở & Tiện ích', component: Sofa },
  { name: 'Key', label: 'Chìa khóa', group: 'Nhà ở & Tiện ích', component: Key },
  { name: 'Lightbulb', label: 'Đèn / Chiếu sáng', group: 'Nhà ở & Tiện ích', component: Lightbulb },
  { name: 'Sparkles', label: 'Dọn dẹp / Vệ sinh', group: 'Nhà ở & Tiện ích', component: Sparkles },
  { name: 'Receipt', label: 'Hóa đơn chung', group: 'Nhà ở & Tiện ích', component: Receipt },
  { name: 'Zap', label: 'Tiền điện', group: 'Nhà ở & Tiện ích', component: Zap },
  { name: 'Droplets', label: 'Tiền nước', group: 'Nhà ở & Tiện ích', component: Droplets },
  { name: 'Flame', label: 'Tiền gas / Năng lượng', group: 'Nhà ở & Tiện ích', component: Flame },
  { name: 'Phone', label: 'Điện thoại cố định', group: 'Nhà ở & Tiện ích', component: Phone },
  { name: 'Smartphone', label: 'Cước di động / Nạp thẻ', group: 'Nhà ở & Tiện ích', component: Smartphone },
  { name: 'Wifi', label: 'Cáp quang / Internet', group: 'Nhà ở & Tiện ích', component: Wifi },
  { name: 'Tv', label: 'Truyền hình / Đăng ký', group: 'Nhà ở & Tiện ích', component: Tv },
  { name: 'FileText', label: 'Giấy tờ / Hồ sơ', group: 'Nhà ở & Tiện ích', component: FileText },

  // Di chuyển & Du lịch
  { name: 'Car', label: 'Ô tô', group: 'Di chuyển & Du lịch', component: Car },
  { name: 'Fuel', label: 'Xăng xe / Nhiên liệu', group: 'Di chuyển & Du lịch', component: Fuel },
  { name: 'Bike', label: 'Xe máy / Xe đạp', group: 'Di chuyển & Du lịch', component: Bike },
  { name: 'Bus', label: 'Xe buýt / Xe khách', group: 'Di chuyển & Du lịch', component: Bus },
  { name: 'Train', label: 'Tàu hỏa / Tàu điện', group: 'Di chuyển & Du lịch', component: Train },
  { name: 'Plane', label: 'Máy bay / Vé máy bay', group: 'Di chuyển & Du lịch', component: Plane },
  { name: 'Navigation', label: 'Đường xá / Cầu đường', group: 'Di chuyển & Du lịch', component: Navigation },
  { name: 'Ship', label: 'Phà / Thuyền', group: 'Di chuyển & Du lịch', component: Ship },

  // Sức khỏe, Thể thao & Giáo dục
  { name: 'HeartPulse', label: 'Khám chữa bệnh', group: 'Sức khỏe & Học tập', component: HeartPulse },
  { name: 'Pill', label: 'Thuốc men', group: 'Sức khỏe & Học tập', component: Pill },
  { name: 'Stethoscope', label: 'Bác sĩ / Nha khoa', group: 'Sức khỏe & Học tập', component: Stethoscope },
  { name: 'Dumbbell', label: 'Gym / Thể hình', group: 'Sức khỏe & Học tập', component: Dumbbell },
  { name: 'Activity', label: 'Vận động thể thao', group: 'Sức khỏe & Học tập', component: Activity },
  { name: 'GraduationCap', label: 'Học phí / Đại học', group: 'Sức khỏe & Học tập', component: GraduationCap },
  { name: 'BookOpen', label: 'Sách vở / Tài liệu', group: 'Sức khỏe & Học tập', component: BookOpen },
  { name: 'Pencil', label: 'Dụng cụ học tập', group: 'Sức khỏe & Học tập', component: Pencil },
  { name: 'School', label: 'Trường học / Lớp học', group: 'Sức khỏe & Học tập', component: School },

  // Giải trí, Thú cưng, Cá nhân
  { name: 'Gamepad2', label: 'Trò chơi / Game', group: 'Giải trí & Cá nhân', component: Gamepad2 },
  { name: 'Film', label: 'Xem phim / Rạp chiếu', group: 'Giải trí & Cá nhân', component: Film },
  { name: 'Music', label: 'Âm nhạc / Buổi hòa nhạc', group: 'Giải trí & Cá nhân', component: Music },
  { name: 'Camera', label: 'Chụp ảnh / Nghệ thuật', group: 'Giải trí & Cá nhân', component: Camera },
  { name: 'Compass', label: 'Dã ngoại / Phiêu lưu', group: 'Giải trí & Cá nhân', component: Compass },
  { name: 'Ticket', label: 'Vé tham quan / Sự kiện', group: 'Giải trí & Cá nhân', component: Ticket },
  { name: 'Dog', label: 'Chó cưng', group: 'Giải trí & Cá nhân', component: Dog },
  { name: 'Cat', label: 'Mèo cưng', group: 'Giải trí & Cá nhân', component: Cat },
  { name: 'Baby', label: 'Mẹ & Bé', group: 'Giải trí & Cá nhân', component: Baby },
  { name: 'User', label: 'Chăm sóc cá nhân', group: 'Giải trí & Cá nhân', component: User },
  { name: 'Heart', label: 'Làm từ thiện / Tình cảm', group: 'Giải trí & Cá nhân', component: Heart },
  { name: 'Smile', label: 'Làm đẹp / Spa', group: 'Giải trí & Cá nhân', component: Smile },

  // Dịch vụ, Sửa chữa & Thanh toán
  { name: 'Wrench', label: 'Sửa chữa / Bảo dưỡng', group: 'Dịch vụ & Kỹ thuật', component: Wrench },
  { name: 'Hammer', label: 'Xây dựng / Cơ khí', group: 'Dịch vụ & Kỹ thuật', component: Hammer },
  { name: 'Scissors', label: 'Cắt tóc / Thợ may', group: 'Dịch vụ & Kỹ thuật', component: Scissors },
  { name: 'ShieldCheck', label: 'Bảo hiểm / Bảo vệ', group: 'Dịch vụ & Kỹ thuật', component: ShieldCheck },
  { name: 'CreditCard', label: 'Thanh toán thẻ', group: 'Dịch vụ & Kỹ thuật', component: CreditCard },
  { name: 'Wallet', label: 'Ví tiền', group: 'Dịch vụ & Kỹ thuật', component: Wallet },
  { name: 'Banknote', label: 'Tiền mặt', group: 'Dịch vụ & Kỹ thuật', component: Banknote },

  // Thu nhập & Đầu tư
  { name: 'Briefcase', label: 'Lương cố định / Công việc', group: 'Thu nhập & Tài chính', component: Briefcase },
  { name: 'Award', label: 'Tiền thưởng', group: 'Thu nhập & Tài chính', component: Award },
  { name: 'Trophy', label: 'Giải thưởng / Hoa hồng', group: 'Thu nhập & Tài chính', component: Trophy },
  { name: 'TrendingUp', label: 'Đầu tư / Lợi nhuận', group: 'Thu nhập & Tài chính', component: TrendingUp },
  { name: 'LineChart', label: 'Chứng khoán / Cổ phiếu', group: 'Thu nhập & Tài chính', component: LineChart },
  { name: 'Store', label: 'Kinh doanh / Cửa hàng', group: 'Thu nhập & Tài chính', component: Store },
  { name: 'Landmark', label: 'Ngân hàng / Lãi tiết kiệm', group: 'Thu nhập & Tài chính', component: Landmark },
  { name: 'PiggyBank', label: 'Ống heo / Tích lũy', group: 'Thu nhập & Tài chính', component: PiggyBank },
  { name: 'RefreshCw', label: 'Hoàn tiền / Hoàn trả', group: 'Thu nhập & Tài chính', component: RefreshCw },
  { name: 'HandCoins', label: 'Được biếu / Trợ cấp', group: 'Thu nhập & Tài chính', component: HandCoins },
  { name: 'DollarSign', label: 'Ngoại tệ / Thu nhập USD', group: 'Thu nhập & Tài chính', component: DollarSign },
  { name: 'Coins', label: 'Tiền xu / Tiền lẻ', group: 'Thu nhập & Tài chính', component: Coins },
  { name: 'BadgePercent', label: 'Cổ tức / Chiết khấu', group: 'Thu nhập & Tài chính', component: BadgePercent },
  { name: 'Globe', label: 'Nguồn thu quốc tế', group: 'Thu nhập & Tài chính', component: Globe },

  // Khác
  { name: 'MoreHorizontal', label: 'Mục khác', group: 'Khác', component: MoreHorizontal },
  { name: 'CircleDot', label: 'Chung', group: 'Khác', component: CircleDot },
  { name: 'Star', label: 'Đặc biệt', group: 'Khác', component: Star },
  { name: 'CheckCircle', label: 'Hoàn tất', group: 'Khác', component: CheckCircle },
];

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string; strokeWidth?: number }>> =
  CATEGORY_ICON_DEFINITIONS.reduce((acc, item) => {
    acc[item.name] = item.component;
    return acc;
  }, {} as Record<string, React.ComponentType<{ size?: number; color?: string; className?: string; strokeWidth?: number }>>);

export const DEFAULT_CATEGORY_PALETTE = [
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#64748b', // Slate
  '#78716c', // Stone
];
