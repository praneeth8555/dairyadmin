import React, { useRef, useEffect } from "react";
import { Box, Button, Heading, useToast, Flex } from "@chakra-ui/react";
import { FaDownload, FaShareAlt, FaArrowLeft } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";

const ShareBill = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const billRef = useRef(null);
    const { orders, selectedCustomer } = location.state || {};

    useEffect(() => {
        if (!orders || !orders.bill_details) {
            navigate("/billing");
        }
    }, [orders, navigate]);

    const shareBill = async () => {
        if (!orders || !orders.bill_details.length) {
            toast({ title: "No bill data to share.", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        try {
            const canvas = await html2canvas(billRef.current, { scale: 2 });
            const image = canvas.toDataURL("image/png");

            if (navigator.share) {
                await navigator.share({
                    title: "Monthly Bill",
                    text: `Monthly Bill for ${selectedCustomer.label}`,
                    files: [new File([await (await fetch(image)).blob()], "bill.png", { type: "image/png" })],
                });
            } else {
                const link = document.createElement("a");
                link.href = image;
                link.download = `Monthly_Bill.png`;
                link.click();
                toast({ title: "Bill downloaded successfully!", status: "success", duration: 3000, isClosable: true });
            }
        } catch (error) {
            console.error("Error sharing bill:", error);
            toast({ title: "Error sharing the bill.", status: "error", duration: 3000, isClosable: true });
        }
    };

    return (
        <Box p={6}>
            <Flex align="center" mb={4}>
                <Button leftIcon={<FaArrowLeft />} colorScheme="teal" variant="outline" onClick={() => navigate(-1)}>
                    Back
                </Button>
                <Heading textAlign="center" flex="1" color="#002C3E">Share Bill</Heading>
            </Flex>

            <Box ref={billRef} p={6} bg="gray.50" borderRadius="lg" boxShadow="md">
                {/* Render the bill table similar to MonthlyBilling.js */}
                <Heading size="md" mb={4}>Bill for {selectedCustomer.label}</Heading>
                {orders?.bill_details?.map(bill => (
                    <Box key={bill.date} border="1px solid gray" p={4} mb={2} borderRadius="md">
                        <Heading size="sm">{new Date(bill.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</Heading>
                        {bill.products.length > 0 ? (
                            <ul>
                                {bill.products.map(product => (
                                    <li key={product.product_id}>
                                        {product.quantity} × ₹{product.price_per_unit} = <strong>₹{product.total_price}</strong>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No Orders</p>
                        )}
                        <strong>Total: ₹{bill.daybill}</strong>
                    </Box>
                ))}
                <Heading size="md" color="blue.700">Grand Total: ₹{orders.total_bill}</Heading>
            </Box>

            <Flex justify="center" mt={4} gap={4}>
                <Button leftIcon={<FaDownload />} colorScheme="blue" onClick={shareBill}>Download Bill</Button>
                <Button leftIcon={<FaShareAlt />} colorScheme="green" onClick={shareBill}>Share Bill</Button>
            </Flex>
        </Box>
    );
};

export default ShareBill;
