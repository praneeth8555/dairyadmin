import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    Box,
    Button,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Spinner,
    useToast,
    Flex,
    IconButton,
    List,
    ListItem,
    ListIcon,
    Text

} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft,FaCheckCircle } from "react-icons/fa";
import CONFIG from "../config"; // Assuming CONFIG.API_BASE_URL is defined in config.js

const DailyOrderSummary = () => {
    const navigate = useNavigate();
    const [apartments, setApartments] = useState([]);
    const [selectedApartment, setSelectedApartment] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [roomSummary, setRoomSummary] = useState([]);
    const [totalSummary, setTotalSummary] = useState([]);
    const [products, setProducts] = useState({});
    const toast = useToast();

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

    // Fetch Products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/products`);
                const productMap = {};
                response.data.forEach((p) => {
                    productMap[p.product_id] = `${p.product_name} (${p.unit})`;
                });
                setProducts(productMap);
            } catch (error) {
                toast({ title: "Error fetching products", status: "error" });
            }
        };
        fetchProducts();
    }, [toast]);

    // Convert date to YYYY-MM-DD format
    const formatDate = (date) => date.toISOString().split("T")[0];

    // Fetch Room-wise Summary
    const fetchRoomSummary = async () => {
        if (!selectedApartment) {
            toast({ title: "Select an apartment", status: "warning" });
            return;
        }

        setLoading(true);
        setTotalSummary([]); // Clear previous total summary

        try {
            const response = await axios.get(
                `${CONFIG.API_BASE_URL}/daily-summary`,
                {
                    params: { apartment_id: selectedApartment.value, date: formatDate(selectedDate) },
                }
            );
            setRoomSummary(response.data.user_orders);
        } catch (error) {
            toast({ title: "Error fetching room-wise summary", status: "error" });
        }
        setLoading(false);
    };

    // Fetch Total Summary
    const fetchTotalSummary = async () => {
        if (!selectedApartment) {
            toast({ title: "Select an apartment", status: "warning" });
            return;
        }

        setLoading(true);
        setRoomSummary([]); // Clear previous room summary

        try {
            const response = await axios.get(
                `${CONFIG.API_BASE_URL}/daily-totalsummary`,
                {
                    params: { apartment_id: selectedApartment.value, date: formatDate(selectedDate) },
                }
            );
            setTotalSummary(response.data.totals);
            console.log(response.data.totals);
        } catch (error) {
            toast({ title: "Error fetching total summary", status: "error" });
        }
        setLoading(false);
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
                    Daily Order Summary
                </Heading>
            </Flex>

            <Box display="flex" justifyContent="center" alignItems="center" mb={4} >
                <Select
                    options={apartments}
                    placeholder="Select Apartment"
                    value={selectedApartment}
                    onChange={setSelectedApartment}
                    styles={{ container: (base) => ({ ...base, flex: 1, marginRight: "10px",maxWidth:"500px" }) } }
                />
                <DatePicker
                    showIcon
                    selected={selectedDate}
                    onChange={setSelectedDate}
                    dateFormat="yyyy-MM-dd"
                    customInput={
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                height:"40px",
                                padding: "15px 20px",
                                border: "1px solid #ccc",
                                borderRadius: "6px",
                                fontSize: "14px",
                                backgroundColor: "#fff",
                                cursor: "pointer",
                                gap: "8px",
                            }}
                        >
                            <span style={{ display: "inline-block" }}>
                                <i className="fa fa-calendar" style={{ fontSize: "16px", color: "#888" }}></i>
                            </span>
                            <span style={{ flex: 1 }}>{selectedDate?.toISOString().slice(0, 10) || "yyyy-MM-dd"}</span>
                        </div>
                    }
                />


            </Box>

            <Box display="flex" justifyContent="center" mb={4}>
                <Button colorScheme="blue" mr={3} onClick={fetchRoomSummary}>Room-wise Summary</Button>
                <Button colorScheme="green" onClick={fetchTotalSummary}>Total Summary</Button>
            </Box>

            {loading && <Spinner size="xl" mt={4} />}

            {/* Room-wise Summary Table */}
            {roomSummary.length > 0 && (
                <Box mt={6}>
                    <Heading size="md" mb={4}>Room-wise Summary</Heading>
                    <Box overflowY="auto" maxHeight="400px">
                        <Table variant="striped" colorScheme="gray">
                            <Thead>
                                <Tr>
                                    <Th>Room</Th>
                                    {/* <Th>Name</Th> */}
                                    <Th>Products</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {roomSummary.map((user) => (
                                    <Tr key={user.user_id}>
                                        <Td>{user.room_number}</Td>
                                        {/* <Td>{user.name}</Td> */}
                                        <Td>
                                            {user.orders.length > 0 ? (
                                                <List spacing={2}>
                                                    {user.orders.map((order, index) => (
                                                        <ListItem key={index}>
                                                            <ListIcon as={FaCheckCircle} color="green.500" />
                                                            <Text as="span" fontStyle="italic">
                                                                {`${products[order.product_id] || "Unknown Product"}`}
                                                            </Text>
                                                            {` - ${order.quantity}`}
                                                        </ListItem>

                                                    ))}
                                                </List>
                                            ) : (
                                                "No Orders"
                                            )}
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                </Box>
            )}


            {/* Total Summary Table */}
            {totalSummary.length > 0 && (
                <Box mt={6} p={4} borderRadius="lg" boxShadow="md" bg="white">
                    <Heading size="md" mb={4} color="teal.600" fontWeight="semibold">
                        Total Summary
                    </Heading>
                    <Table variant="striped" colorScheme="gray" size="sm" >
                        <Thead>
                            <Tr>
                                <Th color="gray.600" fontWeight="bold" textTransform="uppercase">Product</Th>
                                <Th color="gray.600" fontWeight="bold" textTransform="uppercase">Total Quantity</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {totalSummary.map((summary) => (
                               
                                <Tr key={summary.product_id}>
                                    <Td >{products[summary.product_id] || "Unknown"}</Td>
                                    <Td>{summary.quantity}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            )}

        </Box>
    );
};

export default DailyOrderSummary;
