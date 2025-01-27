import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Box,
    Button,
    Select,
    Grid,
    GridItem,
    // Card,
    // CardBody,
    // CardFooter,
    Text,
    Stack,
    // Modal,
    // ModalOverlay,
    // ModalContent,
    // ModalHeader,
    // ModalBody,
    // ModalCloseButton,
    Input,
    useToast,
    Flex,
    InputGroup,
    InputLeftElement,
    IconButton,
    useDisclosure,
    Tooltip,
    VStack

} from "@chakra-ui/react";
import { FaSearch, FaEdit, FaTrash, FaPhone, FaEnvelope, FaHouseUser } from "react-icons/fa"
import "./ManageCustomersPage.css"
import { PiBuildingApartmentFill } from "react-icons/pi";
import DefaultOrderModal from "./DefaultOrderModal";
import CONFIG from "../config";
import CustomerDrawer from "./CustomerDrawer";
const ManageCustomersPage = ({ apartments }) => {
    const [customers, setCustomers] = useState([]);
    const [newCustomer, setNewCustomer] = useState({
        name: "",
        apartment_id: "",
        room_number: "",
        phone_number: "",
        email: ""
    });
    // const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [selectedApartment, setSelectedApartment] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const toast = useToast();
    //const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);
    const [products, setProducts] = useState([]);
    const [isDefaultOrderModalOpen, setIsDefaultOrderModalOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    //const [selectedDefaultOrder, setSelectedDefaultOrder] = useState([]);
    const [selectedCustomerDefaultOrder, setSelectedCustomerDefaultOrder] = useState([]);
    const [flippedCustomerId, setFlippedCustomerId] = useState(null);
    const { isOpen, onOpen, onClose } = useDisclosure();


    const fetchCustomers = useCallback(async () => {    
        try {
            const response = await axios.get(`${CONFIG.API_BASE_URL}/customers`);
            setCustomers(response.data || []);
        } catch (error) {
            setCustomers([]);
            toast({ title: "Error fetching customers", status: "error" });
        }
    }, [toast]); 

    useEffect(() => {
        if (apartments?.length > 0 && !selectedApartment) {
            setSelectedApartment(apartments[0].apartment_id);
        }
        fetchCustomers();
    }, [apartments,selectedApartment,fetchCustomers]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/products`);
                setProducts(response.data);
            } catch (error) {
                toast({ title: "Error fetching products", status: "error" });
            }
        };

        fetchProducts();
    }, [toast]);

    const fetchDefaultOrder = async (customerId) => {
        try {
            const response = await axios.get(`${CONFIG.API_BASE_URL}/customers/${customerId}/default-order`);


            // ✅ Extract only the products array and set it correctly
            setSelectedCustomerDefaultOrder(response.data.products || []);
        } catch (error) {
            setSelectedCustomerDefaultOrder([]); // Ensure it's an empty array if the fetch fails
            console.error("Error fetching default order:", error);
        }
    };

    const updateCustomer = async () => {
        if (!editCustomer.name || !editCustomer.apartment_id || !editCustomer.room_number) {
            toast({ title: "All fields are required", status: "warning" });
            return;
        }

        // Prepare request payload
        const requestBody = {
            name: editCustomer.name,
            apartment_id: editCustomer.apartment_id,
            room_number: editCustomer.room_number,
            phone_number: editCustomer.phone_number,
            email: editCustomer.email,
        };
        console.log(requestBody)
        try {
            await axios.put(`${CONFIG.API_BASE_URL}/customers/${editCustomer.user_id}`, requestBody);
            toast({ title: "Customer updated successfully!", status: "success" });
            onClose();
            fetchCustomers();
            // setIsCustomerModalOpen(false);
            setEditCustomer(null);
            // Reset after update
        } catch (error) {
            toast({ title: "Failed to update customer", status: "error" });
        }
    };



    const deleteCustomer = async (customerId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this customer?");
        if (!confirmDelete) return;

        try {
            await axios.delete(`${CONFIG.API_BASE_URL}/customers/${customerId}`);
            toast({ title: "Customer deleted successfully!", status: "success" });
            fetchCustomers();
        } catch (error) {
            toast({ title: "Failed to delete customer", status: "error" });
        }
    };


    const addCustomer = async () => {
        
        if (!newCustomer.name || !newCustomer.apartment_id || !newCustomer.room_number) {
            toast({ title: "Please fill in all required fields", status: "warning" });
            return;
        }

        // Create request payload
        const requestBody = {
            name: newCustomer.name,
            apartment_id: newCustomer.apartment_id,
            room_number: newCustomer.room_number,
            phone_number: newCustomer.phone_number,
            email: newCustomer.email,
        };

        // Only add products if there are any
        if (newCustomer.products && newCustomer.products.length > 0) {
            requestBody.products = newCustomer.selectedDefaultOrder.map(product => ({
                product_id: product.product_id,
                quantity: product.quantity
            }));
        }

        try {
            await axios.post(`${CONFIG.API_BASE_URL}/customers`, requestBody);
            setNewCustomer({
                name: "",
                apartment_id: "",
                room_number: "",
                phone_number: "",
                email: "",
               
            });
            onClose();
            fetchCustomers();
            toast({ title: "Customer added!", status: "success" });
            // setIsCustomerModalOpen(false);
        } catch (error) {
            toast({ title: "Failed to add customer", status: "error" });
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

    return (
        <Box>
            {/* Add Customer Button */}
            <Flex justify="flex-end" mb={4}>
                <Button colorScheme="green"
                //  onClick={() => setIsCustomerModalOpen(true)}
                    onClick={() => { setEditCustomer(null); onOpen(); }}
                 >
                    Add Customer
                </Button>
            </Flex>

            {/* Apartment Filter and Search Bar */}
            <Flex justify="center" align="center" gap={4} mb={6}>
                {/* Dropdown Filter */}
                <Select
                    //placeholder="Filter by Apartment"
                    value={selectedApartment}
                    onChange={(e) => {
                        const selectedApartmentId = e.target.value;
                        setSelectedApartment(selectedApartmentId); // ✅ Updates selectedApartment
                        setNewCustomer((prev) => ({
                            ...prev, // ✅ Keeps existing values
                            apartment_id: selectedApartmentId, // ✅ Updates apartment_id in newCustomer
                        }));
                    }}
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
                        <GridItem key={customer.user_id} className="card-container" onClick={() => {
                            setFlippedCustomerId(flippedCustomerId === customer.user_id ? null : customer.user_id);
                            fetchDefaultOrder(customer.user_id);
                        }}>
                            <Box className={`card ${flippedCustomerId === customer.user_id ? "flipped" : ""}`}>
                                {/* Front Side */}
                                <Box className="card-front" borderWidth="1px" borderRadius="lg" overflow="hidden" p={4} >
                                    <Stack spacing={1}>
                                        <Text fontWeight="bold" fontSize="16px" fontStyle="italic" textAlign="center" >{customer.name}</Text>
                                        <Box
                                            borderBottom="1px dashed gray"  // Dotted separator
                                            width="100%"
                                            my={2} // Margin for spacing
                                        />
                                        
                                        <Text display="flex" alignItems="#center" gap="8px" fontWeight="500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontStyle="italic">
                                            <FaHouseUser style={{ color: "#71717a" }} />
                                            <span>{customer.room_number}</span>
                                        </Text>
                                        
                                      
                                        <Text display="flex" alignItems="center" gap="8px" overflow="hidden" fontWeight="bold" textOverflow="ellipsis" whiteSpace="nowrap" fontStyle="italic">
                                                <PiBuildingApartmentFill style={{ color: "#71717a" }} />
                                                <span> {apartments.find((a) => a.apartment_id === customer.apartment_id)?.apartment_name || "Unknown"}</span>
                                            </Text>
                                          
                                       
                                        <Text display="flex" alignItems="center" gap="8px" overflow="hidden" fontWeight="bold" textOverflow="ellipsis" whiteSpace="nowrap" fontStyle="italic">
                                            <FaPhone style={{ color: "#71717a" }} />
                                                <span>{customer.phone_number ? customer.phone_number : "NA"}</span>
                                            </Text>
                                     

                                        {/* Conditionally render email if it exists */}
                                        
                                        <Text display="flex" alignItems="center" gap="8px" fontWeight="bold" fontStyle="italic">
                                            <FaEnvelope style={{ color: "#71717a", flexShrink: 0 }} />
                                                <Tooltip label={customer.email} aria-label="Full email">
                                                    <span
                                                        style={{
                                                            whiteSpace: "nowrap", // Prevents text from breaking into multiple lines
                                                            overflow: "hidden",   // Ensures overflow is clipped
                                                            textOverflow: "ellipsis", // Adds "..." for clipped text
                                                            maxWidth: "150px",    // Adjust as needed for your design
                                                            display: "inline-block", // Required for proper text clipping
                                                            verticalAlign: "middle", // Keeps text aligned with icons or other elements
                                                        }}
                                                    >
                                                        {customer.email ? customer.email : "NA"}
                                                    </span>
                                                </Tooltip>

                                            </Text>
                                       

                                        <Flex className="bottom-buttons" pb={2} gap={2} justifyContent="center" mt="auto">
                                            <IconButton
                                                size="sm"
                                                color="white.500"
                                                
                                                icon={<FaEdit />}
                                                aria-label="Edit"
                                                onClick={(e) => { e.stopPropagation(); setEditCustomer(customer); onOpen(); }}
                                            />
                                            <IconButton
                                                size="sm"
                                                color="black.500"
                                                icon={<FaTrash />}
                                                aria-label="Delete"
                                                onClick={(e) => { e.stopPropagation(); deleteCustomer(customer.user_id) }}
                                            />
                                        </Flex>
                                    </Stack>



                                </Box>

                                {/* Back Side - Default Order */}
                                <Box className="card-back" borderWidth="1px" borderRadius="lg" p={4}>
                                    {/* Sticky Heading */}
                                    <Text fontWeight="bold" className="sticky-header">
                                        Default Order of {`${customer.name} (${customer.room_number})`}
                                    </Text>


                                    {/* Scrollable Content */}
                                    <Box className="scrollable-list" justifyItems="center">
                                        {selectedCustomerDefaultOrder.length > 0 ? (
                                            <Stack spacing={1}>
                                                <VStack spacing={1} align="stretch">
                                                    {selectedCustomerDefaultOrder.map((item) => {
                                                        const product = products.find((p) => p.product_id === item.product_id);
                                                        return (
                                                            <Flex
                                                                key={item.product_id}
                                                                align="center"
                                                                justify="space-between"
                                                                p={1}
                                                                borderBottom="1px solid #E2E8F0"
                                                                fontSize="sm"
                                                                whiteSpace="nowrap"
                                                                overflow="hidden"
                                                                textOverflow="ellipsis"
                                                            >
                                                                {/* Product Name & Unit in a single line */}
                                                                <Text fontWeight="medium" color="gray.700" isTruncated>
                                                                    {product ? `${product.product_name} (${product.unit})` : "Unknown Product"}
                                                                </Text>

                                                                {/* Quantity with a soft highlight */}
                                                                <Text fontWeight="bold" color="blue.500">
                                                                    {item.quantity}
                                                                </Text>
                                                            </Flex>
                                                        );
                                                    })}
                                                </VStack>


                                            </Stack>
                                        ) : (
                                            <Box justifyContent="center" justifyItems="center">
                                                <Text >No default order items.</Text>
                                            </Box>

                                        )}
                                    </Box>

                                    {/* Buttons at the Bottom */}
                                    <Box className="bottom-buttons">
                                        <Button size="sm" colorScheme="teal" onClick={() => {
                                            // e.stopPropagation(); 
                                            setSelectedCustomerId(customer.user_id);
                                            setIsDefaultOrderModalOpen(true);
                                        }}>
                                            {selectedCustomerDefaultOrder.length > 0 ? "Edit Default Order" : "Create Default Order"}
                                        </Button>
                                    </Box>
                                </Box>


                            </Box>
                        </GridItem>
                    ))
                ) : (
                    <Text>No customers available for the selected apartment.</Text>
                )}
            </Grid>


            {/* Add Customer Modal */}
            <DefaultOrderModal
                isOpen={isDefaultOrderModalOpen}
                onClose={() => setIsDefaultOrderModalOpen(false)}
                customerId={selectedCustomerId}

            />
            <CustomerDrawer
                isOpen={isOpen}
                onClose={onClose}
                editCustomer={editCustomer}
                setEditCustomer={setEditCustomer}
                newCustomer={newCustomer}
                setNewCustomer={setNewCustomer}
                apartments={apartments}
                selectedApartment={selectedApartment}
                addCustomer={addCustomer}
                updateCustomer={updateCustomer}
            />
        </Box>
    );
};

export default ManageCustomersPage;