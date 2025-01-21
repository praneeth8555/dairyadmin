import React, { useState, useCallback } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    Box,
    Text,
    VStack,
} from "@chakra-ui/react";
import axios from "axios";

const PriceHistory = ({ productId, isOpen, onClose }) => {
    const [priceHistory, setPriceHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // ✅ Wrap fetchPriceHistory with useCallback to prevent unnecessary re-renders
    const fetchPriceHistory = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await axios.get(`http://localhost:8080/products/${productId}/price-history`);
            setPriceHistory(response.data || []);
        } catch (error) {
            console.error("Error fetching price history:", error);
            setPriceHistory([]);
        } finally {
            setIsLoading(false);
        }
    }, [productId]); // ✅ Dependency added here

    React.useEffect(() => {
        if (productId && isOpen) {
            fetchPriceHistory();
        }
    }, [productId, isOpen, fetchPriceHistory]); // ✅ No more ESLint warning

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Price History</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    {isLoading ? (
                        <Text>Loading...</Text>
                    ) : priceHistory?.length > 0 ? (
                        <VStack align="stretch" spacing={4}>
                            {priceHistory.map((entry, index) => (
                                <Box key={index} p={4} borderWidth={1} borderRadius="md">
                                    <Text>Date: {new Date(entry.effective_from).toLocaleDateString('en-GB')}</Text>
                                    <Text>Old Price: ₹{entry.old_price}</Text>
                                    <Text>New Price: ₹{entry.new_price}</Text>
                                </Box>
                            ))}
                        </VStack>
                    ) : (
                        <Text>No price history available.</Text>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose}>Close</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default PriceHistory;
