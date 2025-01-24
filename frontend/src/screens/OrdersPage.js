import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Heading,
    useToast,
    Spinner,
    Flex,
    List,
    ListItem,
    ListIcon,
    IconButton
} from "@chakra-ui/react";
import { FaCheckCircle, FaEdit, FaPlayCircle, FaPauseCircle, FaArrowLeft } from "react-icons/fa";// For styling product list
import axios from "axios";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import EditOrderModal from "./EditOrderModal";
import EditOrderForDateModal from "./EditOrderForDateModal";
import CONFIG from "../config";
const OrdersPage = () => {
    const navigate = useNavigate()
    const [apartments, setApartments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState({});
    const [selectedApartment, setSelectedApartment] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [month, setMonth] = useState(null);
    const [year, setYear] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [isEditForDateModalOpen, setIsEditForDateModalOpen] = useState(false);
    const [editOrderDate, setEditOrderDate] = useState(null);
    const [editOrderProducts, setEditOrderProducts] = useState([]);
    const toast = useToast();

    useEffect(() => {
        const fetchApartments = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/apartments`);
                setApartments(response.data.map(ap => ({ value: ap.apartment_id, label: ap.apartment_name })));
            } catch (error) {
                toast({ title: "Error fetching apartments", status: "error", duration: 3000, isClosable: true });
            }
        };
        fetchApartments();
    }, [toast]);

    useEffect(() => {
        if (!selectedApartment) return;

        const fetchCustomers = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/customers`);
                const filteredCustomers = response.data
                    .filter(cust => cust.apartment_id === selectedApartment.value)
                    .map(cust => ({ value: cust.user_id, label: `${cust.name}(Room ${cust.room_number})` }));
                setCustomers(filteredCustomers);
            } catch (error) {
                toast({ title: "Error fetching customers", status: "error", duration: 3000, isClosable: true });
            }
        };

        fetchCustomers();
    }, [selectedApartment, toast]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/products`);
                const productMap = {};
                response.data.forEach(product => {
                    productMap[product.product_id] = product.product_name;
                });
                setProducts(productMap);
            } catch (error) {
                toast({ title: "Error fetching products", status: "error", duration: 3000, isClosable: true });
            }
        };
        fetchProducts();
    }, [toast]);

    const fetchOrders = async () => {
        if (!selectedCustomer || !month || !year) {
            toast({ title: "Please select all required fields", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(
                `${CONFIG.API_BASE_URL}/orders?customer_id=${selectedCustomer.value}&month=${month.value}&year=${year.value}`
            );
            setOrders(response.data);
        } catch (error) {
            toast({ title: "Error fetching orders", status: "error", duration: 3000, isClosable: true });
        } finally {
            setLoading(false);
        }
    };
    const pauseOrder = async (userId, date) => {
        const confirmPause = window.confirm(`Do you want to pause the order on ${date}?`);
        if (!confirmPause) return;
        try {
            await axios.post(`${CONFIG.API_BASE_URL}/orders/pause`, {
                user_id: userId,
                start_date: date,
                end_date: date
            });

            toast({ title: "Order paused successfully", status: "success", duration: 3000, isClosable: true });

            fetchOrders(); // Reload data after pausing order

        } catch (error) {

            toast({ title: "Error pausing order", status: "error", duration: 3000, isClosable: true });

        }

    };
    const resumeOrder = async (userId, date) => {
        const confirmresume = window.confirm(`Do you want to resume the defaultorder on ${date}?`);
        if (!confirmresume) return;

        try {

            await axios.post(`${CONFIG.API_BASE_URL}/orders/resume`, {
                user_id: userId,
                start_date: date,
                end_date: date
            });
            toast({ title: "Default Order resumed successfully", status: "success", duration: 3000, isClosable: true });
            fetchOrders();

        } catch (error) {
            toast({ title: "Error resuming order", status: "error", duration: 3000, isClosable: true });
        }

    };
    const handleOpenEditModal = () => {
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    const handleOpenEditForDateModal = (orderDate, orders) => {
        console.log("orde",orders)
        console.log("orda",orderDate)
        setEditOrderDate(orderDate);
        setEditOrderProducts(orders); // ✅ Pass existing order data
        setIsEditForDateModalOpen(true);
    };

    const handleCloseEditForDateModal = () => {
        setIsEditForDateModalOpen(false);
    };

    return (
        <Box p={6}>
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
                    ManageOrders
                </Heading>
            </Flex>

            <Flex
                justify="space-between"
                wrap={{ base: "wrap", md: "nowrap" }}
                gap={3}
                mb={5}
                direction={{ base: "column", md: "row" }}
                zIndex="1000"
            >
                <Box flex={1} zIndex="1000">
                    <Select
                        placeholder="Select Apartment"
                        options={apartments}
                        value={selectedApartment}
                        onChange={setSelectedApartment}
                        styles={{
                            menuPortal: base => ({ ...base, zIndex: 9999 }), // High z-index for dropdown
                        }}
                    />
                </Box>
                <Box flex={1} zIndex="999">
                    <Select
                        placeholder="Select Customer"
                        options={customers}
                        value={selectedCustomer}
                        onChange={setSelectedCustomer}
                        styles={{
                            menuPortal: base => ({ ...base, zIndex: 9999 }), // High z-index for dropdown
                        }}

                    />
                </Box>
                <Box flex={1} zIndex="998">
                    <Select
                        placeholder="Select Month"
                        options={Array.from({ length: 12 }, (_, i) => ({
                            value: (i + 1).toString().padStart(2, "0"),
                            label: new Date(0, i).toLocaleString("default", { month: "long" }),
                        }))}
                        value={month}
                        onChange={setMonth}
                        styles={{
                            menuPortal: base => ({ ...base, zIndex: 9999 }), // High z-index for dropdown
                        }}
                    />
                </Box>
                <Box flex={1} zIndex="997">
                    <Select
                        placeholder="Select Year"
                        options={[2023, 2024, 2025].map(y => ({ value: y.toString(), label: y.toString() }))}
                        value={year}
                        onChange={setYear}
                        styles={{
                            menuPortal: base => ({ ...base, zIndex: 9999 }), // High z-index for dropdown
                        }}
                    />
                </Box>
                <Button colorScheme="blue" onClick={fetchOrders} isLoading={loading}>
                    Fetch Data
                </Button>
            </Flex>

            {loading ? (
                <Spinner size="lg" display="block" mx="auto" />
            ) : (
                <Box>
                    <Box overflowY="auto" maxH="500px">
                        <Table variant="striped" colorScheme="gray">
                            <Thead position="sticky" top="0" zIndex="100" bg="white">
                                <Tr>
                                    <Th fontSize="md">Date</Th>
                                    <Th fontSize="md">Orders</Th>
                                    <Th fontSize="md">Action</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {orders.map(order => (
                                    <Tr key={order.date}>
                                        <Td>{new Intl.DateTimeFormat('en-GB', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        }).format(new Date(order.date))}</Td>
                                        <Td>
                                            {order.orders.length > 0 ? (
                                                <List spacing={2}>
                                                    {order.orders.map(o => (
                                                        <ListItem key={o.product_id}>
                                                            <ListIcon as={FaCheckCircle} color="green.500" />
                                                            {`${products[o.product_id] || "Unknown Product"}: ${o.quantity}`}
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            ) : (
                                                "Orders Paused"
                                            )}
                                        </Td>
                                        <Td>
                                            {order.orders.length > 0 ? (
                                                <Flex gap={2}>
                                                    <IconButton
                                                        size="md"
                                                        colorScheme="teal"
                                                        icon={<FaEdit />}
                                                        aria-label="Edit"
                                                        onClick={() => handleOpenEditForDateModal(order.date, order.orders)} // ✅ Pass customer ID
                                                    />
                                                    <IconButton
                                                        size="md"
                                                        colorScheme="yellow"
                                                        icon={<FaPauseCircle />}
                                                        aria-label="pause"
                                                        onClick={() => pauseOrder(selectedCustomer.value, order.date)}
                                                    />
                                                </Flex>
                                            ) : (
                                                <IconButton
                                                    size="md"
                                                    colorScheme="pink"
                                                    icon={<FaPlayCircle />}
                                                    aria-label="resume"
                                                    onClick={() => resumeOrder(selectedCustomer.value, order.date)}
                                                />
                                            )}

                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>

                    </Box>
                        <Flex justify="end" mt={4}>
                            {orders.length > 0 && (
                                <Button
                                    colorScheme="blue"
                                    size="md"
                                    onClick={handleOpenEditModal}
                                >
                                    Modify Range
                                </Button>
                            )}
                        </Flex>

                </Box>
            )}
             <EditOrderModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                customerId={selectedCustomer?.value}
                fetchOrders={fetchOrders}
            />
            <EditOrderForDateModal
                isOpen={isEditForDateModalOpen}
                onClose={handleCloseEditForDateModal}
                customerId={selectedCustomer?.value}
                orderDate={editOrderDate}
                orderProducts={editOrderProducts} // ✅ Pass products of that day
                fetchOrders={fetchOrders}
            />

        </Box>
    );
};

export default OrdersPage; 