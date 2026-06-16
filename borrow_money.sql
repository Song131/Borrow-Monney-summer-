-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 16, 2026 at 01:30 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `borrow_money`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `username` varchar(45) DEFAULT NULL,
  `password` varchar(45) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `First_Name` varchar(45) DEFAULT NULL,
  `Last_Name` varchar(45) DEFAULT NULL,
  `bankName` varchar(50) DEFAULT NULL,
  `bankAccount` varchar(20) DEFAULT NULL,
  `bankAccountName` varchar(100) DEFAULT NULL,
  `promptpayId` varchar(13) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `username`, `password`, `email`, `First_Name`, `Last_Name`, `bankName`, `bankAccount`, `bankAccountName`, `promptpayId`) VALUES
(1, 'admin', 'admin123', 'admin@test.com', 'แอดมิน', 'ระบบ', 'ธนาคารกรุงเทพ (BBL)', '336-0-75820-9', 'นาย ศรินธร ภมร', '0615573048'),
(2, 'testuser', 'test123', '', 'ทดสอบ', 'ระบบ', NULL, NULL, NULL, NULL),
(3, 'Test1', '123456', '', 'ศรินธร', 'ภมร', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE `customer` (
  `id` int(11) NOT NULL,
  `firstName` varchar(45) DEFAULT NULL,
  `lastName` varchar(45) DEFAULT NULL,
  `phone` varchar(45) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `occupation` varchar(45) DEFAULT NULL,
  `monthlyIncome` decimal(12,2) DEFAULT NULL,
  `citizenNumber` varchar(13) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customer`
--

INSERT INTO `customer` (`id`, `firstName`, `lastName`, `phone`, `address`, `occupation`, `monthlyIncome`, `citizenNumber`) VALUES
(1, 'ทดสอบ', 'ลูกหนี้', '0812345678', NULL, NULL, NULL, '1234567890123');

-- --------------------------------------------------------

--
-- Table structure for table `guarantor`
--

CREATE TABLE `guarantor` (
  `id` int(11) NOT NULL,
  `loan_id` int(11) NOT NULL,
  `name` varchar(80) DEFAULT NULL,
  `phone` varchar(10) DEFAULT NULL,
  `citizenNumber` varchar(13) DEFAULT NULL,
  `relationship` varchar(30) DEFAULT NULL,
  `loan_id1` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `loan`
--

CREATE TABLE `loan` (
  `id` int(11) NOT NULL,
  `date` datetime DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `rate` decimal(5,2) DEFAULT NULL,
  `month` int(11) DEFAULT NULL,
  `dueDate` datetime DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `loanStatus` varchar(10) DEFAULT NULL,
  `cdnurl` varchar(500) DEFAULT NULL,
  `customer_id` int(11) NOT NULL,
  `Admin_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loan`
--

INSERT INTO `loan` (`id`, `date`, `amount`, `rate`, `month`, `dueDate`, `purpose`, `loanStatus`, `cdnurl`, `customer_id`, `Admin_id`) VALUES
(1, '2026-06-16 01:53:53', 40000.00, 15.00, 12, '2027-06-16 01:53:53', 'ค่าขนม', 'active', NULL, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

CREATE TABLE `payment` (
  `id` int(11) NOT NULL,
  `loan_id` int(11) NOT NULL,
  `payDate` datetime DEFAULT NULL,
  `payAmount` decimal(12,2) DEFAULT NULL,
  `lateFee` decimal(10,2) DEFAULT NULL,
  `method` varchar(15) DEFAULT NULL,
  `cdnurl` varchar(500) DEFAULT NULL,
  `stats` enum('รอตรวจ','อนุมัติ','ปฏิเสธ') DEFAULT 'รอตรวจ',
  `Admin_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment`
--

INSERT INTO `payment` (`id`, `loan_id`, `payDate`, `payAmount`, `lateFee`, `method`, `cdnurl`, `stats`, `Admin_id`) VALUES
(1, 1, '2026-06-16 02:29:35', 3610.32, 0.00, 'โอน', '/uploads/slips/slip_1781551775553.jpg', 'อนุมัติ', 1),
(2, 1, '2026-06-16 02:31:35', 3610.33, 0.00, 'โอน', '/uploads/slips/slip_1781551895529.jpg', 'อนุมัติ', 1),
(3, 1, '2026-06-16 02:42:39', 3610.33, 0.00, 'โอน', '/uploads/slips/slip_1781552559151.png', 'อนุมัติ', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `guarantor`
--
ALTER TABLE `guarantor`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_guarantor_loan1_idx` (`loan_id1`);

--
-- Indexes for table `loan`
--
ALTER TABLE `loan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_loan_customer1_idx` (`customer_id`),
  ADD KEY `fk_loan_Admin1_idx` (`Admin_id`);

--
-- Indexes for table `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_payment_Admin1_idx` (`Admin_id`),
  ADD KEY `fk_payment_loan_idx` (`loan_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `guarantor`
--
ALTER TABLE `guarantor`
  ADD CONSTRAINT `fk_guarantor_loan1` FOREIGN KEY (`loan_id1`) REFERENCES `loan` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `loan`
--
ALTER TABLE `loan`
  ADD CONSTRAINT `fk_loan_Admin1` FOREIGN KEY (`Admin_id`) REFERENCES `admin` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_loan_customer1` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `fk_payment_Admin1` FOREIGN KEY (`Admin_id`) REFERENCES `admin` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_payment_loan` FOREIGN KEY (`loan_id`) REFERENCES `loan` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
