import React, { useEffect, useState } from "react";
import {
    Box, Button, Accordion, AccordionItem, AccordionButton, AccordionPanel,    FormControl,
        Input,Flex,IconButton,
    AccordionIcon, Text, Table, Thead, Tr, Th, Tbody, Td, Heading, Spinner, useToast
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft} from "react-icons/fa";

// import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import CONFIG from "../config"; // Make sure API_BASE_URL is configured

const DailySalesSummary = () => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split("T")[0]; // "YYYY-MM-DD"
    });
    
    const [salesData, setSalesData] = useState([]);
    const [products, setProducts] = useState({});
    const [loading, setLoading] = useState(false);
    const [apartmentMap, setApartmentMap] = useState({});

    const toast = useToast();

    //const formatDate = (date) => date.toISOString().split("T")[0];

    // const fetchApartments = async () => {
    //     try {
    //         const res = await axios.get(`${CONFIG.API_BASE_URL}/apartments`);
    //         const map = {};
    //         res.data.forEach((apt) => {
    //             map[apt.apartment_id] = apt.apartment_name;
    //         });
    //         setApartmentMap(map);
    //     } catch (err) {
    //         toast({ title: "Error fetching apartments", status: "error" });
    //     }
    // };

    // useEffect(() => {
    //     fetchProducts();
    //     fetchApartments(); // fetch both on mount
    // }, []);
    
     useEffect(() => {
            const fetchApartments = async () => {
                try {
                    const res = await axios.get(`${CONFIG.API_BASE_URL}/apartments`);
                    const map = {};
                    res.data.forEach((apt) => {
                        map[apt.apartment_id] = apt.apartment_name;
                    });
                    setApartmentMap(map);
                } catch (err) {
                    toast({ title: "Error fetching apartments", status: "error" });
                }
            };
            fetchApartments();
        }, [toast]);
    
        // Fetch Products
        useEffect(() => {
            const fetchProducts = async () => {
                    try {
                        const res = await axios.get(`${CONFIG.API_BASE_URL}/products`);
                        const map = {};
                        res.data.forEach((p) => {
                            map[p.product_id] = `${p.product_name} (${p.unit})`;
                        });
                        setProducts(map);
                    } catch (error) {
                        toast({ title: "Error fetching products", status: "error" });
                    }
            };
            fetchProducts();
        }, [toast]);
    // const fetchProducts = async () => {
    //     try {
    //         const res = await axios.get(`${CONFIG.API_BASE_URL}/products`);
    //         const map = {};
    //         res.data.forEach((p) => {
    //             map[p.product_id] = `${p.product_name} (${p.unit})`;
    //         });
    //         setProducts(map);
    //     } catch (error) {
    //         toast({ title: "Error fetching products", status: "error" });
    //     }
    // };

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${CONFIG.API_BASE_URL}/daily-SalesSummary`, {
                params: { date: selectedDate }
            });
            setSalesData(res.data.sales || []);
        } catch (error) {
            toast({ title: "Error fetching sales data", status: "error" });
        }
        setLoading(false);
    };

    const calculateTotalRevenue = () => {
        return salesData.reduce((sum, p) => sum + p.tqty * p.price, 0);
    };

    return (
        <Box maxW="800px" mx="auto" p={6}>
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
    
                <Heading mb={4} textAlign="center" color="teal.700">Daily Sales Summary</Heading>

                </Flex>
            

            <Box display="flex" justifyContent="center" mb={4} gap={4}>
                {/* <DatePicker
                    selected={selectedDate}
                    onChange={setSelectedDate}
                    dateFormat="yyyy-MM-dd"
                    className="chakra-input css-1c6mb7v"
                /> */}
                <FormControl mb={4} >

                    <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                        border="2px solid"
                        borderColor="teal.500"
                        borderRadius="md"
                        boxShadow="sm"
                        focusBorderColor="teal.600"
                        _hover={{ borderColor: "teal.600" }}
                        _focus={{ boxShadow: "0 0 0 2px rgba(56, 178, 172, 0.6)" }} />
                </FormControl>
                <Button colorScheme="blue" onClick={fetchSales}>Fetch</Button>
            </Box>

            {loading ? (
                <Spinner size="xl" />
            ) : (
                <Accordion allowToggle>
                    {salesData.map((item, index) => (
                        <AccordionItem key={index} border="1px solid #ccc" borderRadius="md" mb={2}>
                            <AccordionButton>
                                <Box flex="1" textAlign="left">
                                    <Text fontWeight="bold">{products[item.pid] || "Unknown Product"}</Text>
                                    <Text fontSize="sm">Qty: {item.tqty} | ₹{item.price} each | ₹{item.price * item.tqty} total</Text>
                                </Box>
                                <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel pb={4}>
                                {item.apartments.length > 0 ? (
                                    <Table size="sm" variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Apartment</Th>
                                                <Th isNumeric>Quantity</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {item.apartments.map((apt, idx) => (
                                                <Tr key={idx}>
                                                    <Td>{apartmentMap[apt.app1_id] || apt.app1_id}</Td>
                                                    <Td isNumeric>{apt.qty}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                ) : (
                                    <Text>No apartment breakdown.</Text>
                                )}
                            </AccordionPanel>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}

            {!loading && salesData.length > 0 && (
                <Box mt={6} textAlign="right">
                    <Text fontSize="lg" fontWeight="bold" color="green.600">
                        Grand Total: ₹{calculateTotalRevenue().toFixed(2)}
                    </Text>
                </Box>
            )}
        </Box>
    );
};

export default DailySalesSummary;
