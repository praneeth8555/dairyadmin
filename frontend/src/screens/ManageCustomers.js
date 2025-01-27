import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Tabs, TabList, TabPanels, Tab, TabPanel, Box, Heading, Button, Input, useToast,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, Flex, IconButton,
    ModalCloseButton, Text, VStack, Skeleton
} from "@chakra-ui/react";
import { FaTrash, FaArrowLeft } from "react-icons/fa";
import ManageCustomersPage from "./ManageCustomersPage";
import { useNavigate } from "react-router-dom";
import CONFIG from "../config";

const ManageCustomers = () => {
    const navigate = useNavigate();
    const [apartments, setApartments] = useState([]);
    const [newApartment, setNewApartment] = useState("");
    const [isApartmentModalOpen, setIsApartmentModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    // Fetch Apartments
    const fetchApartments = useCallback(async () => {
        try {
            setLoading(true); // Start loading before API call
            const response = await axios.get(`${CONFIG.API_BASE_URL}/apartments`);
            setApartments(response.data || []); // Ensure data is always an array
        } catch (error) {
            toast({ title: "Error fetching apartments", status: "error" });
            setApartments([]); // Even if error, apartments should be an empty array
        } finally {
            setLoading(false); // Stop loading after API call
        }
    }, [toast]);

    useEffect(() => {
        fetchApartments();
    }, [fetchApartments]);

    // Add Apartment
    const addApartment = async () => {
        if (!newApartment) return;
        try {
            await axios.post(`${CONFIG.API_BASE_URL}/apartments`, { apartment_name: newApartment });
            setNewApartment("");
            fetchApartments();
            toast({ title: "Apartment added!", status: "success" });
            setIsApartmentModalOpen(false);
        } catch (error) {
            toast({ title: "Failed to add apartment", status: "error" });
        }
    };

    // Delete Apartment
    const deleteApartment = async (id) => {
        const isConfirmed = window.confirm(
            "Are you sure you want to delete this apartment? This action cannot be undone."
        );
        if (!isConfirmed) return;

        try {
            await axios.delete(`${CONFIG.API_BASE_URL}/apartments/${id}`);
            fetchApartments();
            toast({ title: "Apartment deleted!", status: "success" });
        } catch (error) {
            toast({ title: "Failed to delete apartment", status: "error" });
        }
    };

    return (
        <Box p={8}>
            <Flex align="center" mb={6}>
                <IconButton
                    icon={<FaArrowLeft />}
                    aria-label="Back"
                    onClick={() => navigate("/managementpanel")}
                    colorScheme="teal"
                    variant="outline"
                    borderWidth="2px"
                    borderColor="teal.500"
                    _hover={{ bg: "teal.50" }}
                    _focus={{ boxShadow: "0 0 5px teal" }}
                    mr={4}
                    size="lg"
                />
                <Heading textAlign="center" color="#002C3E" flex="1">
                    Apartment & Customer Management
                </Heading>
            </Flex>

            <Tabs isFitted variant="enclosed" colorScheme="teal">
                <TabList mb={4} borderBottom="2px solid teal">
                    <Tab
                        _selected={{
                            color: "white",
                            bg: "teal.500",
                            fontWeight: "bold",
                            borderRadius: "md",
                        }}
                    >
                        Manage Apartments
                    </Tab>
                    <Tab
                        isDisabled={loading} // ✅ Disable Manage Customers until apartments load
                        _selected={{
                            color: "white",
                            bg: "teal.500",
                            fontWeight: "bold",
                            borderRadius: "md",
                        }}
                    >
                        Manage Customers
                    </Tab>
                </TabList>

                <TabPanels>
                    {/* Manage Apartments Tab */}
                    <TabPanel>
                        <Button colorScheme="blue" mb={4} onClick={() => setIsApartmentModalOpen(true)}>
                            Add Apartment
                        </Button>

                        <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
                            {loading ? (
                                // ✅ Skeleton Loader (3 placeholders)
                                <VStack spacing={4}>
                                    <Skeleton height="50px" width="100%" />
                                    <Skeleton height="50px" width="100%" />
                                    <Skeleton height="50px" width="100%" />
                                </VStack>
                            ) : apartments.length > 0 ? (
                                <VStack spacing={3} align="stretch">
                                    {apartments.map((apartment) => (
                                        <Flex
                                            key={apartment.apartment_id}
                                            align="center"
                                            justify="space-between"
                                            p={3}
                                            borderRadius="md"
                                            bg="gray.50"
                                            boxShadow="xs"
                                            _hover={{ bg: "gray.100" }}
                                        >
                                            {/* Apartment Name */}
                                            <Text fontSize="md" fontWeight="medium" color="gray.800">
                                                {apartment.apartment_name}
                                            </Text>

                                            {/* Delete Button */}
                                            <Button
                                                leftIcon={<FaTrash />}
                                                colorScheme="red"
                                                size="sm"
                                                onClick={() => deleteApartment(apartment.apartment_id)}
                                            >
                                                Delete
                                            </Button>
                                        </Flex>
                                    ))}
                                </VStack>
                            ) : (
                                <Text textAlign="center" color="gray.500">
                                    No apartments available
                                </Text>
                            )}
                        </Box>

                        {/* Modal to Add Apartment */}
                        <Modal isOpen={isApartmentModalOpen} onClose={() => setIsApartmentModalOpen(false)}>
                            <ModalOverlay />
                            <ModalContent>
                                <ModalHeader>Add Apartment</ModalHeader>
                                <ModalCloseButton />
                                <ModalBody>
                                    <Input
                                        placeholder="Apartment Name"
                                        value={newApartment}
                                        onChange={(e) => setNewApartment(e.target.value)}
                                    />
                                    <Button mt={4} colorScheme="blue" onClick={addApartment}>
                                        Save
                                    </Button>
                                </ModalBody>
                            </ModalContent>
                        </Modal>
                    </TabPanel>

                    {/* Manage Customers Tab */}
                    <TabPanel>
                        <ManageCustomersPage apartments={apartments} fetchApartments={fetchApartments} />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Box>
    );
};

export default ManageCustomers;
