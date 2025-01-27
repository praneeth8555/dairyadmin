import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import {
    Box,
    Button,
    Heading,
    List,
    ListItem,
    Text,
    Flex,
    useToast,
    IconButton
} from "@chakra-ui/react";
import CONFIG from "../config";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const CustomerSorting = () => {
    const [apartments, setApartments] = useState([]);
    const [selectedApartment, setSelectedApartment] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [draggedCustomer, setDraggedCustomer] = useState(null);
    const toast = useToast();
    const navigate = useNavigate();

    // Fetch Apartments
    useEffect(() => {
        const fetchApartments = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/apartments`);
                setApartments(
                    response.data.map((apt) => ({
                        value: apt.apartment_id,
                        label: apt.apartment_name,
                    }))
                );
            } catch (error) {
                toast({ title: "Error fetching apartments", status: "error" });
            }
        };
        fetchApartments();
    }, [toast]);

    // Fetch Customers Based on Selected Apartment
    useEffect(() => {
        if (!selectedApartment) return;
        const fetchCustomers = async () => {
            try {
                const response = await axios.get(
                    `${CONFIG.API_BASE_URL}/apartcustomers?apartment_id=${selectedApartment.value}`
                );
                setCustomers(response.data);
            } catch (error) {
                toast({ title: "Error fetching customers", status: "error" });
            }
        };
        fetchCustomers();
    }, [selectedApartment, toast]);

    // Handle Drag Start
    const handleDragStart = (index) => {
        setDraggedCustomer(index);
    };

    // Handle Drag Over (Prevent default to allow drop)
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Handle Drop
    const handleDrop = (index) => {
        if (draggedCustomer === null) return;

        const updatedCustomers = [...customers];
        const [movedCustomer] = updatedCustomers.splice(draggedCustomer, 1);
        updatedCustomers.splice(index, 0, movedCustomer);

        // Update priority_order based on new order
        const reorderedCustomers = updatedCustomers.map((customer, idx) => ({
            ...customer,
            priority_order: idx + 1,
        }));

        setCustomers(reorderedCustomers);
        setDraggedCustomer(null);
    };

    // Save Updated Priorities to Backend
    const savePriorities = async () => {
        if (!selectedApartment) {
            toast({ title: "Please select an apartment", status: "warning" });
            return;
        }

        try {
            await axios.put(`${CONFIG.API_BASE_URL}/update-priorities`, {
                apartment_id: selectedApartment.value,
                customers: customers.map((customer) => ({
                    user_id: customer.user_id,
                    priority_order: customer.priority_order,
                })),
            });

            toast({ title: "Priorities updated successfully!", status: "success" });
            setIsEditing(false); // Exit edit mode after saving
        } catch (error) {
            toast({ title: "Error updating priorities", status: "error" });
        }
    };

    return (
        <Box maxW="600px" mx="auto" p={6}>
            <Flex align="center" mb={4}>
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
                    Priority Assignment
                </Heading>
            </Flex>

            {/* Apartment Selection */}
            <Select
                options={apartments}
                placeholder="Select Apartment"
                value={selectedApartment}
                onChange={setSelectedApartment}
                isClearable
            />

            {/* Edit Mode Toggle */}
            {customers.length > 0 && (
                <Flex justify="space-between" mt={4}>
                    <Button colorScheme="blue" onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? "Cancel" : "Edit"}
                    </Button>
                </Flex>
            )}

            {/* Manual Drag-and-Drop List */}
            {customers.length > 0 && (
                <List spacing={2} mt={4}>
                    {customers.map((customer, index) => (
                        <ListItem
                            key={customer.user_id}
                            draggable={isEditing} // Allow dragging only in edit mode
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                            p={3}
                            bg={draggedCustomer === index ? "gray.300" : "gray.100"}
                            borderRadius="md"
                            boxShadow="md"
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            cursor={isEditing ? "grab" : "default"}
                        >
                            <Flex alignItems="center" justifyContent="space-between" width="100%">
                                {/* Align name and room on the left */}
                                <Text fontWeight="bold">
                                    {customer.name} (Room: {customer.room_number})
                                </Text>

                                {/* Align priority on the right */}
                                <Text fontWeight="bold" color="gray.600">
                                    Priority: {customer.priority_order}
                                </Text>
                            </Flex>
                        </ListItem>

                    ))}
                </List>
            )}

            {/* Save Button */}
            {isEditing && customers.length > 0 && (
                <Button colorScheme="green" mt={4} w="full" onClick={savePriorities}>
                    Save New Order
                </Button>
            )}
        </Box>
    );
};

export default CustomerSorting;
