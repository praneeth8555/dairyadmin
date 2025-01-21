import React, { useState, useEffect,useCallback } from "react";
import axios from "axios";
import { Tabs, TabList, TabPanels, Tab, TabPanel, Box, Heading, Button, Table, Thead, 
    Tbody, Tr, Th, Td, Input, useToast, Modal, ModalOverlay, ModalContent, 
    ModalHeader, ModalBody,Flex,IconButton,
     ModalCloseButton } from "@chakra-ui/react";
import { FaTrash ,FaArrowLeft} from "react-icons/fa";
import ManageCustomersPage from "./ManageCustomersPage";
import { useNavigate } from "react-router-dom";

const ManageCustomers = () => {
    const navigate=useNavigate()
    const [apartments, setApartments] = useState([]);
    const [newApartment, setNewApartment] = useState("");
    const [isApartmentModalOpen, setIsApartmentModalOpen] = useState(false);
    const toast = useToast();

    

   
    const fetchApartments = useCallback(async () => {
        try {
            const response = await axios.get("http://localhost:8080/apartments");
            setApartments(response.data);
           
        } catch (error) {
            toast({ title: "Error fetching apartments", status: "error" });
        }
    }, [toast]); 
    useEffect(() => {
        fetchApartments();
    }, [fetchApartments]); 
    const addApartment = async () => {
        if (!newApartment) return;
        try {
            await axios.post("http://localhost:8080/apartments", { apartment_name: newApartment });
            setNewApartment("");
            fetchApartments();
            toast({ title: "Apartment added!", status: "success" });
            setIsApartmentModalOpen(false);
        } catch (error) {
            toast({ title: "Failed to add apartment", status: "error" });
        }
    };

    const deleteApartment = async (id) => {
        try {
            await axios.delete(`http://localhost:8080/apartments/${id}`);
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
                    variant="outline"  // ✅ Outline style instead of ghost
                    borderWidth="2px"  // ✅ Adds a thick outline
                    borderColor="teal.500"  // ✅ Teal border color
                    _hover={{
                        bg: "teal.50",  // ✅ Light teal background on hover
                    }}
                    _focus={{
                        boxShadow: "0 0 5px teal",  // ✅ Adds focus glow effect
                    }}
                    mr={4}
                    size="lg"
                />

                <Heading textAlign="center" color="#002C3E" flex="1">
                    Apartment & Customer Management
                </Heading>
            </Flex>
            
            <Tabs
                isFitted
                variant="enclosed"
                colorScheme="teal"
            >
                <TabList mb={4} borderBottom="2px solid teal">
                    <Tab
                        _selected={{
                            color: "white",
                            bg: "teal.500",
                            fontWeight: "bold",
                            borderRadius: "md",
                        }}

                    >Manage Apartments</Tab>
                    <Tab
                        _selected={{
                            color: "white",
                            bg: "teal.500",
                            fontWeight: "bold",
                            borderRadius: "md",
                        }}
                        >Manage Customers</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <Button colorScheme="blue" mb={4} onClick={() => setIsApartmentModalOpen(true)}>Add Apartment</Button>
                        <Box>
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Apartment Name</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {apartments.length > 0 ? (
                                        apartments.map((apartment) => (
                                            <Tr key={apartment.apartment_id}>
                                                <Td>{apartment.apartment_name}</Td>
                                                <Td>
                                                    <Button
                                                        leftIcon={<FaTrash />}
                                                        colorScheme="red"
                                                        size="sm"
                                                        onClick={() => deleteApartment(apartment.apartment_id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </Td>
                                            </Tr>
                                        ))
                                    ) : (
                                        <Tr>
                                            <Td colSpan="2" textAlign="center">No apartments available</Td>
                                        </Tr>
                                    )}
                                </Tbody>
                            </Table>
                        </Box>

                        <Modal isOpen={isApartmentModalOpen} onClose={() => setIsApartmentModalOpen(false)}>
                            <ModalOverlay />
                            <ModalContent>
                                <ModalHeader>Add Apartment</ModalHeader>
                                <ModalCloseButton />
                                <ModalBody>
                                    <Input placeholder="Apartment Name" value={newApartment} onChange={(e) => setNewApartment(e.target.value)} />
                                    <Button mt={4} colorScheme="blue" onClick={addApartment}>Save</Button>
                                </ModalBody>
                            </ModalContent>
                        </Modal>
                    </TabPanel>
                    <TabPanel>
                        <ManageCustomersPage apartments={apartments} fetchApartments={fetchApartments} />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Box>
    );
};

export default ManageCustomers;
