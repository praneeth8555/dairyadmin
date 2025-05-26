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
import { FaArrowLeft,FaCheckCircle,FaCopy } from "react-icons/fa";
import CONFIG from "../config"; // Assuming CONFIG.API_BASE_URL is defined in config.js
import html2canvas from "html2canvas";
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
            //console.log(response.data.user_orders)
            // setRoomSummary(response.data.user_orders);
            setRoomSummary(Array.isArray(response.data.user_orders)
                          ? response.data.user_orders
                   : []);

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
             setTotalSummary(Array.isArray(response.data.totals)
            ? response.data.totals
           : []);
            console.log(response.data.totals);
        } catch (error) {
            toast({ title: "Error fetching total summary", status: "error" });
        }
        setLoading(false);
    };

        const handleCopyBill = async () => {
            const billElement = document.getElementById("bill-table");
            if (!billElement) {
                toast({ title: "Bill table not found!", status: "error", duration: 3000, isClosable: true });
                return;
            }
            try {
                const canvas = await html2canvas(billElement, { scale: 2 });
                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        toast({ title: "Bill copied to clipboard!", status: "success", duration: 3000, isClosable: true });
                    } catch (err) {
                        toast({ title: "Failed to copy bill", status: "error", duration: 3000, isClosable: true });
                    }
                });
            } catch (error) {
                toast({ title: "Error copying bill", status: "error", duration: 3000, isClosable: true });
            }
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

            {loading && <Spinner size="lg" display="block" mx="auto" />}
            
            
            <Box maxW="600px" mx="auto" bg="gray.50" p={4}  borderRadius="lg" boxShadow="sm">      
            {/* Room-wise Summary Table */}
            {roomSummary.length > 0 && (
                
                <Box >
                        <Button
                            leftIcon={<FaCopy />}
                            colorScheme="blue"
                            onClick={handleCopyBill}
                            isDisabled={!roomSummary.length === 0} // ✅ Prevents sharing if no data
                        >
                            copy Bill
                        </Button>
                    {/* <Heading size="md" mb={4}>Room-wise Summary</Heading> */}
                    <Box overflowY="auto" maxHeight="400px">
                            <Table id="bill-table" variant="simple" colorScheme="gray" size="sm">

                             <Thead>
                                <Tr bg="white">
                                    <Th colSpan={3} textAlign="center" fontSize="sm" fontStyle="italic" color="black" p={1} border="1px solid gray">
                                        Room-wise Summary
                                    </Th>
                                </Tr>
                                <Tr bg="white">
                                    <Th colSpan={3} textAlign="center" fontSize="sm" fontStyle="italic" color="black" p={1} border="1px solid gray">
                                        Sri Balaji Milk Supply
                                    </Th>
                                </Tr>
                                <Tr bg="white">
                                    <Th colSpan={3} textAlign="center" fontSize="xs" fontWeight="semibold" color="black" p={1} border="1px solid gray">
                                        PH NO: <b>9963432665</b> / <b>7989495557</b>
                                    </Th>
                                </Tr>
                                    <Tr bg="white">
                                        <Th colSpan={3} textAlign="center" fontSize="md" fontWeight="bold" color="black" p={2} border="1px solid gray">
                                            {formatDate(selectedDate)}
                                        </Th>
                                    </Tr>
                                    <Tr bg="white">
                                        <Th colSpan={3} textAlign="center" fontSize="sm" fontWeight="bold" color="black" p={1} border="1px solid gray">
                                            {selectedApartment?.label}
                                        </Th>
                                    </Tr>
                            </Thead>


                            <Thead bg="teal.500" position="sticky" top="0" zIndex="10"> 

                                <Tr >
                                    <Th color="white" border="1px solid white">Room</Th>
                                    {/* <Th>Name</Th> */}
                                    <Th color="white" border="1px solid white">Products</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {roomSummary.map((user) => (
                                    <Tr key={user.user_id}
                                        borderBottom="2px solid teal"
                                        bg={user.orders.length === 0 ? "red.100" : "inherit"} // ✅ Highlight No Orders
                                    >
                                        <Td border="1px solid teal" fontSize="xs" fontWeight="bold" p={1} textAlign="center">{user.room_number}</Td>
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
            </Box> 
            <Box maxW="600px" mx="auto" bg="gray.50" p={4} borderRadius="lg" boxShadow="sm">
            {/* Total Summary Table */}
            {totalSummary.length > 0 && (
                <Box>
                <Button
                            leftIcon={<FaCopy />}
                            colorScheme="blue"
                            onClick={handleCopyBill}
                            isDisabled={!roomSummary.length === 0} // ✅ Prevents sharing if no data
                        >
                            copy Bill
                </Button>
                        <Box overflowY="auto" maxHeight="400px" >
                    
                    <Table id="bill-table" variant="simple" colorScheme="gray" size="sm" >
                        <Thead>
                            <Tr bg="white">
                                <Th colSpan={3} textAlign="center" fontSize="sm" fontStyle="italic" color="black" p={1} border="1px solid gray">
                                    Total Summary
                                </Th>
                            </Tr>
                            <Tr bg="white">
                                <Th colSpan={3} textAlign="center" fontSize="sm" fontStyle="italic" color="black" p={1} border="1px solid gray">
                                    Sri Balaji Milk Supply
                                </Th>
                            </Tr>
                            <Tr bg="white">
                                <Th colSpan={3} textAlign="center" fontSize="xs" fontWeight="semibold" color="black" p={1} border="1px solid gray">
                                    PH NO: <b>9963432665</b> / <b>7989495557</b>
                                </Th>
                            </Tr>
                            <Tr bg="white">
                                <Th colSpan={3} textAlign="center" fontSize="md" fontWeight="bold" color="black" p={2} border="1px solid gray">
                                    {formatDate(selectedDate)}
                                </Th>
                            </Tr>
                            <Tr bg="white">
                                <Th colSpan={3} textAlign="center" fontSize="sm" fontWeight="bold" color="black" p={1} border="1px solid gray">
                                    {selectedApartment?.label}
                                </Th>
                            </Tr>
                        </Thead>
                                <Thead bg="teal.500" position="sticky" top="0" zIndex="10">
                            <Tr>
                                        <Th color="white" border="1px solid white" textTransform="uppercase">Product</Th>
                                        <Th color="white" border="1px solid white" textTransform="uppercase">Total Quantity</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {totalSummary.map((summary) => (
                               
                                <Tr key={summary.product_id} borderBottom="2px solid teal">
                                    <Td border="1px solid teal">{products[summary.product_id] || "Unknown"}</Td>
                                    <Td border="1px solid teal">{summary.quantity}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
                    </Box>
            )}
            </Box>

        </Box>
    );
};

export default DailyOrderSummary;
