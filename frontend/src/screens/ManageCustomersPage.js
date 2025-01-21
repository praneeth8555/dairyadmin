import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Box,
    Button,
    Select,
    Grid,
    GridItem,
    Card,
    CardBody,
    CardFooter,
    Text,
    Stack,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Input,
    useToast,
    Flex,
    InputGroup,
    InputLeftElement
} from "@chakra-ui/react";
import { FaSearch,FaEdit,FaTrash } from "react-icons/fa";
const ManageCustomersPage = ({ apartments, fetchApartments }) => {
    const [customers, setCustomers] = useState([]);
    const [newCustomer, setNewCustomer] = useState({
        name: "",
        apartment_id: "",
        room_number: "",
        phone_number: "",
        email: ""
    });
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [selectedApartment, setSelectedApartment] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const toast = useToast();
    //const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);

    const fetchCustomers = useCallback(async () => {
        try {
            const response = await axios.get("http://localhost:8080/customers");
            setCustomers(response.data || []);
        } catch (error) {
            setCustomers([]);
            toast({ title: "Error fetching customers", status: "error" });
        }
    }, [toast]);

    useEffect(() => {
        fetchApartments();
        fetchCustomers();
    }, [fetchApartments, fetchCustomers]);

    useEffect(() => {
        if (apartments?.length > 0 && !selectedApartment) {
            setSelectedApartment(apartments[0].apartment_id);
        }
    }, [apartments, selectedApartment]);
    const openEditModal = (customer) => {
        setEditCustomer(customer);
        setIsCustomerModalOpen(true);
    };


    const updateCustomer = async () => {
        if (!editCustomer.name || !editCustomer.apartment_id || !editCustomer.room_number) {
            toast({ title: "All fields are required", status: "warning" });
            return;
        }
        try {
            await axios.put(`http://localhost:8080/customers/${editCustomer.user_id}`, editCustomer);
            toast({ title: "Customer updated successfully!", status: "success" });
            fetchCustomers();
            setIsCustomerModalOpen(false);
            setEditCustomer(null);
        } catch (error) {
            toast({ title: "Failed to update customer", status: "error" });
        }
    };

    
    const deleteCustomer = async (customerId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this customer?");
        if (!confirmDelete) return;

        try {
            await axios.delete(`http://localhost:8080/customers/${customerId}`);
            toast({ title: "Customer deleted successfully!", status: "success" });
            fetchCustomers();
        } catch (error) {
            toast({ title: "Failed to delete customer", status: "error" });
        }
    };

    const filteredCustomers = customers.filter((customer) => {
        return (
            (!selectedApartment || customer.apartment_id === selectedApartment) &&
            (customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.phone_number.includes(searchTerm) ||
                customer.room_number.includes(searchTerm))
        );
    });

    const addCustomer = async () => {
        if (!newCustomer.name || !newCustomer.apartment_id || !newCustomer.room_number) {
            toast({ title: "Please fill in all required fields", status: "warning" });
            return;
        }
        try {
            await axios.post("http://localhost:8080/customers", newCustomer);
            setNewCustomer({
                name: "",
                apartment_id: "",
                room_number: "",
                phone_number: "",
                email: ""
            });
            fetchCustomers();
            toast({ title: "Customer added!", status: "success" });
            setIsCustomerModalOpen(false);
        } catch (error) {
            toast({ title: "Failed to add customer", status: "error" });
        }
    };

    return (
        <Box>
            {/* Add Customer Button */}
            <Flex justify="flex-end" mb={4}>
                <Button colorScheme="green" onClick={() => setIsCustomerModalOpen(true)}>
                    Add Customer
                </Button>
            </Flex>

            {/* Apartment Filter and Search Bar */}
            <Flex justify="center" align="center" gap={4} mb={6}>
                {/* Dropdown Filter */}
                <Select
                    //placeholder="Filter by Apartment"
                    value={selectedApartment}
                    onChange={(e) => setSelectedApartment(e.target.value)}
                    maxWidth="200px"
                    size="md"
                    borderColor="teal.500"
                    focusBorderColor="teal.500"
                >
                    {apartments.map((apartment) => (
                        <option key={apartment.apartment_id} value={apartment.apartment_id}>
                            {apartment.apartment_name}
                        </option>
                    ))}
                </Select>

                {/* Search Bar with Icon */}
                <InputGroup maxW="400px">
                    <InputLeftElement pointerEvents="none">
                        <FaSearch color="gray.500" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search by Name, Phone, Room No."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        borderColor="teal.500"        // Sets the default border color
                        focusBorderColor="teal.500"
                    />
                </InputGroup>
            </Flex>


            {/* Customers Grid */}
            <Grid templateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={6}>
                {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                        <GridItem key={customer.user_id}>
                            <Card borderWidth="1px" borderRadius="lg" overflow="hidden">
                                <CardBody pb="5px">
                                    <Stack spacing={1}>
                                        <Text fontWeight="bold">{customer.name}</Text>
                                        <Text>
                                            Apartment:{" "}
                                            {apartments.find((a) => a.apartment_id === customer.apartment_id)
                                                ?.apartment_name || "Unknown"}
                                        </Text>
                                        <Text><b>Room No:</b> {customer.room_number}</Text>
                                        <Text><b>Phone:</b>{customer.phone_number}</Text>
                                        <Text><b>Email:</b> {customer.email}</Text>
                                    </Stack>
                                </CardBody>
                                <CardFooter display="flex" justifyContent="space-between" pt="5px">
                                    <Button
                                        size="sm"
                                        colorScheme="teal"
                                        leftIcon={<FaEdit />}
                                        onClick={() => openEditModal(customer)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        colorScheme="teal"
                                        leftIcon={<FaTrash />}
                                        onClick={() => deleteCustomer(customer.user_id)}
                                    >
                                        Delete
                                    </Button>
                                </CardFooter>
                            </Card>
                        </GridItem>
                    ))
                ) : (
                    <Text>No customers available for the selected apartment.</Text>
                )}
            </Grid>

            {/* Add Customer Modal */}
            <Modal isOpen={isCustomerModalOpen} onClose={() => { setIsCustomerModalOpen(false); setEditCustomer(null); }}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{editCustomer ? "Edit Customer" : "Add Customer"}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Input
                            placeholder="Name"
                            value={editCustomer ? editCustomer.name : newCustomer.name}
                            onChange={(e) => editCustomer
                                ? setEditCustomer({ ...editCustomer, name: e.target.value })
                                : setNewCustomer({ ...newCustomer, name: e.target.value })}
                            mb={3}
                        />
                        <Select
                            value={editCustomer ? editCustomer.apartment_id : newCustomer.apartment_id}
                            onChange={(e) => editCustomer
                                ? setEditCustomer({ ...editCustomer, apartment_id: e.target.value })
                                : setNewCustomer({ ...newCustomer, apartment_id: e.target.value })}
                            mb={3}
                        >
                            {apartments?.length > 0 ? (
                                apartments.map((apt) => (
                                    <option key={apt.apartment_id} value={apt.apartment_id}>
                                        {apt.apartment_name}
                                    </option>
                                ))
                            ) : (
                                <option disabled>No apartments available</option>
                            )}
                        </Select>
                        <Input
                            placeholder="Room No"
                            value={editCustomer ? editCustomer.room_number : newCustomer.room_number}
                            onChange={(e) => editCustomer
                                ? setEditCustomer({ ...editCustomer, room_number: e.target.value })
                                : setNewCustomer({ ...newCustomer, room_number: e.target.value })}
                            mb={3}
                        />
                        <Input
                            placeholder="Phone Number"
                            value={editCustomer ? editCustomer.phone_number : newCustomer.phone_number}
                            onChange={(e) => editCustomer
                                ? setEditCustomer({ ...editCustomer, phone_number: e.target.value })
                                : setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                            mb={3}
                        />
                        <Input
                            placeholder="Email"
                            value={editCustomer ? editCustomer.email : newCustomer.email}
                            onChange={(e) => editCustomer
                                ? setEditCustomer({ ...editCustomer, email: e.target.value })
                                : setNewCustomer({ ...newCustomer, email: e.target.value })}
                            mb={3}
                        />

                        <Button mt={4} colorScheme="green" onClick={editCustomer ? updateCustomer : addCustomer}>
                            {editCustomer ? "Save Changes" : "Add Customer"}
                        </Button>
                    </ModalBody>
                </ModalContent>
            </Modal>

        </Box>
    );
};

export default ManageCustomersPage;
