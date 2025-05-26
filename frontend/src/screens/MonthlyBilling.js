import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Table,
    Th,
    Td,
    Tr,
    Tbody,
    Thead,
    Heading,
    useToast,
    Spinner,
    Flex,
    Text,
    IconButton,
    Image
} from "@chakra-ui/react";
import { FaArrowLeft, FaCopy } from "react-icons/fa";
import axios from "axios";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import CreatableSelect from 'react-select/creatable';
import CONFIG from "../config";
import bg6 from "../images/qrshankar.jpeg";
const MonthlyBilling = () => {
    const navigate = useNavigate();
    const [apartments, setApartments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState({});
    const [selectedApartment, setSelectedApartment] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [month, setMonth] = useState(null);
    const [year, setYear] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

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
                const response = await axios.get(`${CONFIG.API_BASE_URL}/apartcustomers?apartment_id=${selectedApartment.value}`);
                console.log(response.data)
                setCustomers(response.data.map(cust => ({
                    value: cust.user_id,
                    label: `${cust.name} (Room ${cust.room_number})`,  // ✅ Name with Room No
                    room: cust.room_number  ,
                    phone_number:cust.phone_number                        
                }))     
                );
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
                    productMap[product.product_id] = {
                        name: product.product_name,
                        unit: product.unit,
                        acronym: product.acronym || product.product_name.substring(0, 2).toUpperCase() // Fallback
                    };
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
                `${CONFIG.API_BASE_URL}/monthly-bill?customer_id=${selectedCustomer.value}&month=${month.value}&year=${year.value}`
            );
            setOrders(response.data);
        } catch (error) {
            toast({ title: "Error fetching orders", status: "error", duration: 3000, isClosable: true });
        } finally {
            setLoading(false);
        }
    };
    // const handleShareBill = async () => {
    //     const billElement = document.getElementById("bill-table"); // ✅ Capture the table
    //     if (!billElement) {
    //         toast({ title: "Bill table not found!", status: "error", duration: 3000, isClosable: true });
    //         return;
    //     }

    //     try {
    //         // 🖼 Convert the table into an image
    //         const canvas = await html2canvas(billElement, { scale: 2 });
    //         const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    //         if (!navigator.share) {
    //             toast({ title: "Sharing not supported on this device!", status: "error", duration: 3000, isClosable: true });
    //             return;
    //         }

    //         // 📤 Use Web Share API if supported
    //         const file = new File([imageBlob], "bill.png", { type: "image/png" });
    //         const shareData = {
    //             title: "Monthly Bill",
    //             text: "Here is the monthly bill for your reference.",
    //             files: [file], // ✅ Attach the bill image
    //         };

    //         await navigator.share(shareData);
    //     } catch (error) {
    //         console.error("Error sharing bill:", error);
    //         toast({ title: "Failed to share bill!", status: "error", duration: 3000, isClosable: true });
    //     }
    // };

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

    // const SHARE_WINDOW_NAME = "whatsappChatWindow";

    // const shareOnWhatsApp = () => {
    //     // 1) sanitize & E.164-ify the number
    //     let digits = selectedCustomer.phoneNumber.replace(/\D/g, "");
    //     if (digits.length === 10) digits = "91" + digits;

    //     // 2) build your URL
    //     const text = `Here’s your bill for ${month.label} ${year.value}`;
    //     let url: string;
    //     if (navigator.userAgent.match(/Windows|Macintosh/)) {
    //         // desktop → WhatsApp Web
    //         url = `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`;
    //     } else {
    //         // mobile → native app
    //         url = `whatsapp://send?phone=${digits}&text=${encodeURIComponent(text)}`;
    //     }

    //     // 3) open (or reuse) the tab/window
    //     const win = window.open(
    //         url,
    //         navigator.userAgent.match(/Windows|Macintosh/)
    //             ? SHARE_WINDOW_NAME    // named window → reuse if already open
    //             : "_self"              // mobile deep-link in same tab
    //     );
    //     if (win) win.focus();
    // };

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
                    Monthly Billing
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
                    <CreatableSelect
                        placeholder="Select or Add Year"
                        options={[2024, 2025, 2026, 2027].map(y => ({ value: y.toString(), label: y.toString() }))}
                        value={year}
                        onChange={setYear}
                        onCreateOption={(inputValue) => {
                            // Convert input value to an object and update the state
                            const newYear = { value: inputValue, label: inputValue };
                            setYear(newYear);
                        }}
                        styles={{
                            menuPortal: base => ({ ...base, zIndex: 9999 }), // High z-index for dropdown
                        }}
                        menuPortalTarget={document.body} // Ensures the dropdown doesn't get clipped
                    />
                </Box>
                <Button colorScheme="blue" onClick={fetchOrders} isLoading={loading}>
                    Fetch Data
                </Button>
            </Flex>
            <Box p={6} display="flex" justifyContent="center">


                {loading ? (
                    <Spinner size="lg" display="block" mx="auto" />
                ) : (
                    <Box>
                        <Button
                            leftIcon={<FaCopy />}
                            colorScheme="blue"
                            onClick={handleCopyBill}
                            isDisabled={!orders?.bill_details || orders?.bill_details?.length === 0} // ✅ Prevents sharing if no data
                        >
                            copy Bill
                        </Button>

                            {/* <Button
                                leftIcon={<FaShareAlt />}
                                colorScheme="blue"
                                onClick={shareOnWhatsApp}
                                isDisabled={!orders?.bill_details || orders?.bill_details?.length === 0} // ✅ Prevents sharing if no data
                            >
                                whatsapp Bill
                            </Button> */}
                            
                            <Box maxW="600px" mx="auto" p={4} bg="gray.50" borderRadius="lg" boxShadow="sm">
                                {orders?.bill_details?.length > 0 ? (
                                    <Box > {/* ✅ Enables vertical scrolling */}
                                        <Table id="bill-table" variant="simple" colorScheme="gray" size="md">
                                            {/* ✅ Table Heading Row */}
                                            <Thead>
                                                <Tr bg="white">
                                                    <Th colSpan={3} textAlign="center" fontSize="md" fontWeight="bold" color="black" p={2} border="1px solid gray">
                                                        {month?.label} {year?.value}
                                                    </Th>
                                                </Tr>
                                                <Tr bg="white">
                                                    <Th colSpan={3} textAlign="center" fontSize="sm" fontWeight="bold" color="black" p={1} border="1px solid gray">
                                                        {selectedCustomer?.room}, {selectedApartment?.label}
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
                                            </Thead>


                                            <Thead bg="teal.500" position="sticky" top="0" zIndex="10"> {/* ✅ Keeps the header fixed */}
                                                <Tr>
                                                    <Th color="white" border="1px solid white">#</Th>
                                                    <Th color="white" border="1px solid white">Products</Th>
                                                    <Th color="white" border="1px solid white">Price</Th>
                                                </Tr>
                                            </Thead>

                                            <Tbody>
                                                {orders.bill_details.map((bill, index) => {
                                                    // const productSummary = bill.products.length > 0
                                                    //     ? bill.products.map(product => {
                                                    //         const productData = products[product.product_id] || {};
                                                    //         return ${productData.acronym}(${productData.unit})-${product.quantity}X${product.price_per_unit};
                                                    //     }).join(" + ")
                                                    //     : "No Orders"; // ✅ Display "No Orders" when no products exist

                                                    return (
                                                        <Tr key={bill.date}
                                                            borderBottom="2px solid teal"
                                                            bg={bill.products.length === 0 ? "red.100" : "inherit"} // ✅ Highlight No Orders
                                                        >
                                                            <Td border="1px solid teal" fontSize="xs" fontWeight="bold" p={1} textAlign="center">{index + 1}</Td>
                                                            <Td border="1px solid teal" fontSize="xs" fontWeight="bold" p={1}>
                                                                {bill.products.length > 0
                                                                    ? bill.products.map((product, idx) => {
                                                                        const productData = products[product.product_id] || {};
                                                                        return (
                                                                            <span key={idx}>
                                                                                <i>{productData.acronym} ({productData.unit})</i> - {product.quantity} X {product.price_per_unit}
                                                                                {idx !== bill.products.length - 1 ? " + " : ""} {/* ✅ Adds "+" between products */}
                                                                            </span>
                                                                        );
                                                                    })
                                                                    : "No Orders"
                                                                }
                                                            </Td>
                                                                
                                                            <Td fontWeight="bold" color="green.600" border="1px solid teal" fontSize="xs" p={1}>
                                                                ₹{bill.daybill}
                                                            </Td>
                                                        </Tr>
                                                    );
                                                })}

                                                <Tr >
                                                    <Td colSpan={2} fontSize="xs" fontWeight="bold" textAlign="right" border="1px solid teal" py={1}>
                                                        Delivery charges:
                                                    </Td>
                                                    <Td fontSize="xs" fontWeight="bold" color="blue.700" border="1px solid teal" p={1} py={1}>
                                                        ₹ 100
                                                    </Td>
                                                </Tr>
                                                {/* ✅ Grand Total Row */}
                                                <Tr bg="teal.100">
                                                    <Td colSpan={2} fontSize="md" fontWeight="bold" textAlign="right" border="1px solid teal">
                                                        Grand Total:
                                                    </Td>
                                                    <Td fontSize="lg" fontWeight="bold" color="blue.700" border="1px solid teal">
                                                        ₹{orders.total_bill+100}
                                                    </Td>
                                                </Tr>

                                                <Tr>
                                                    <Td colSpan={3} border="1px solid teal" p={3}>
                                                        <Flex alignItems="center" justifyContent="space-between">
                                                            <Box textAlign="left" flex="1" pr={2}>
                                                                <Text fontWeight="bold" color="red.500" fontSize="sm">PL. PAY SOON & SEND SCREENSHOT</Text>
                                                                <Text fontSize="xs" mt={1}>G PAY / PHONE PAY / UPI: <b>7989495557@ybl</b></Text>
                                                                <Text fontSize="xs" mt={1}>Beneficiary: <b>T. SHIVA SHANKER</b> </Text>
                                                                <Text fontSize="xs" mt={1}>Account: <b>13132150000580</b>(Punjab National Bank)</Text>
                                                                <Text fontSize="xs" mt={1}>IFSC CODE: <b>PUNB0131310</b></Text>
                                                                <Text fontSize="xs" mt={1}>Gachibowli Branch, 500032</Text>
                                                            </Box>

                                                            <Box ml={2} textAlign="center">
                                                                <Image
                                                                    src={bg6}
                                                                    alt="payment-qr"
                                                                    boxSize="100px" // ✅ Controlled small size
                                                                    objectFit="contain"
                                                                    border="1px solid black"
                                                                />
                                                                <Text fontSize="xs" mt={1} fontWeight="bold">Scan to Pay</Text>
                                                            </Box>
                                                        </Flex>
                                                    </Td>
                                                </Tr>
                                            </Tbody>
                                        </Table>
                                    </Box>
                                ) : (
                                    <Text textAlign="center" color="gray.500">
                                        No billing data available.
                                    </Text>
                                )}
                            </Box>

                    </Box>
                )}
            </Box>
        </Box>

    );
};

export default MonthlyBilling;
