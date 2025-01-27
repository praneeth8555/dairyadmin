import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    Box, Heading, Image, Grid, Text, IconButton, Menu, MenuButton, MenuList, MenuItem,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button,
    useToast, Spinner, Input
} from "@chakra-ui/react";
import { FaBars } from "react-icons/fa";
import { AuthContext } from "../AuthContext"; // Import AuthContext for logout function
import CONFIG from "../config";

// Import images
import bg2 from "../images/mngprofin.png";
import bg3 from "../images/mngorders.png";
import bg4 from "../images/mngcustomers.png";
import bg5 from "../images/dailyordr.png";
import bg6 from "../images/mnthlybllng.png";
import bg7 from "../images/customersorting.png";

const ManagementPanel = () => {
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext); // Access logout function
    const toast = useToast();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [deletedRecords, setDeletedRecords] = useState(null);

    // Handle Logout
    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Handle Clear Trash (Open Modal)
    const handleClearTrash = () => {
        setIsModalOpen(true);
    };

    // Confirm and Delete Expired Order Modifications
    const handleConfirmClearTrash = async () => {
        if (!selectedDate) {
            toast({ title: "Please select a date", status: "warning" });
            return;
        }

        const isConfirmed = window.confirm(`Are you sure you want to clear entries before ${selectedDate}?`);
        if (!isConfirmed) return;

        setLoading(true); // Show spinner

        try {
            const response = await axios.delete(`${CONFIG.API_BASE_URL}/ordermodificationsclear?date=${selectedDate}`);
            setDeletedRecords(response.data.rows_affected); // Store deleted records count
            toast({ title: "Deleted successfully!", status: "success" });
        } catch (error) {
            toast({ title: "Error deleting records", status: "error" });
        } finally {
            setLoading(false);
            setIsModalOpen(false);
        }
    };

    const buttons = [
        { label: "Manage Products", image: bg2, path: "/products" },
        { label: "Manage Customers", image: bg4, path: "/customers" },
        { label: "Manage Orders", image: bg3, path: "/orders" },
        { label: "Customer Sorting", image: bg7, path: "/sorting" },
        { label: "Daily Order Summary", image: bg5, path: "/summary" },
        { label: "Monthly Billing", image: bg6, path: "/billing" },
    ];

    return (
        <Box px={4} py={4} position="relative">
            {/* Menu Icon at the Top-Right */}
            <Menu>
                <MenuButton
                    as={IconButton}
                    icon={<FaBars />}
                    variant="outline"
                    colorScheme="teal"
                    position="absolute"
                    top={4}
                    right={4}
                />
                <MenuList>
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                    <MenuItem onClick={handleClearTrash}>Clear Trash</MenuItem>
                </MenuList>
            </Menu>

            {/* Page Title */}
            <Box textAlign="center" mb={8}>
                <Heading color="blue.800">Admin Management Panel</Heading>
            </Box>

            {/* Grid Layout */}
            <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }} gap={4}>
                {buttons.map((button) => (
                    <Box
                        key={button.label}
                        textAlign="center"
                        cursor="pointer"
                        onClick={() => navigate(button.path)}
                        transition="transform 0.2s"
                        _hover={{ transform: "scale(1.05)" }}
                    >
                        <Box
                            w="50%"
                            mx="auto"
                            position="relative"
                            paddingBottom="50%"
                            overflow="hidden"
                            borderRadius="14%"
                            boxShadow="lg"
                            _hover={{ boxShadow: "xl" }}
                        >
                            <Image
                                src={button.image}
                                alt={button.label}
                                position="absolute"
                                top="0"
                                left="0"
                                width="100%"
                                height="100%"
                                objectFit="cover"
                            />
                        </Box>
                        <Text fontSize="md" fontWeight="semibold" color="blue.700" mt={2}>
                            {button.label}
                        </Text>
                    </Box>
                ))}
            </Grid>

            {/* Clear Trash Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Clear Order Modifications</ModalHeader>
                    <ModalBody>
                        <Text mb={2}>Select a date to delete all expired order modifications:</Text>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="gray" mr={3} onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button colorScheme="red" onClick={handleConfirmClearTrash} isLoading={loading}>
                            {loading ? <Spinner size="sm" /> : "Clear"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Display Deleted Records Message */}
            {deletedRecords !== null && (
                <Box mt={4} textAlign="center" p={3} bg="green.100" borderRadius="md">
                    <Text fontWeight="bold" color="green.700">
                        {deletedRecords} order modifications cleared before {selectedDate}!
                    </Text>
                </Box>
            )}
        </Box>
    );
};

export default ManagementPanel;
