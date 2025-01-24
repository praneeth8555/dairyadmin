import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    Box,
    FormControl,
    FormLabel,
    Input,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    IconButton,
    useToast
} from "@chakra-ui/react";
import { FaTrash,FaPlus } from "react-icons/fa";
import axios from "axios";
import MyComponent from "./MyComponent";
import CONFIG from "../config";
const EditOrderModal = ({ isOpen, onClose, customerId, fetchOrders }) => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const toast = useToast();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/products`);
                setProducts(response.data);
            } catch (error) {
                toast({ title: "Error fetching products", status: "error", duration: 3000, isClosable: true });
            }
        };
        fetchProducts();
    }, [toast]);
    
    useEffect(() => {
        if (isOpen) {
            setStartDate("");
            setEndDate("");
            setSelectedProducts([]);
            setSelectedProduct(null);
            setSelectedQuantity(1);
        }
    }, [isOpen]);

    const handleAddProduct = () => {
        if (!selectedProduct) {
            toast({ title: "Please select a product", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        // if (selectedProducts.some(p => p.product_id === selectedProduct.value)) {
        //     toast({ title: "Product already selected", status: "error", duration: 3000, isClosable: true });
        //     return;
        // }
        const existingProduct = selectedProducts.find((p) => p.product_id === selectedProduct);
        if (existingProduct) {
            toast({ title: "Product already added", status: "warning" });
            return;
        }
        const productDetails = products.find((p) => p.product_id === selectedProduct);
        if (!productDetails) {
            toast({ title: "Invalid product selection. Please refresh and try again.", status: "error" });
            return;
        }
        setSelectedProducts(prev => [
            ...prev,
            { ...productDetails, quantity: selectedQuantity }
        ]);
        setSelectedProduct(null);
        setSelectedQuantity(1);
    };

    const handleRemoveProduct = productId => {
        setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
    };

    const handleModifyOrder = async () => {
        if (!startDate || !endDate) {
            toast({ title: "Please select both start and end dates", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast({ title: "Start date cannot be after end date", status: "error", duration: 3000, isClosable: true });
            return;
        }

        if (selectedProducts.length === 0) {
            toast({ title: "Please add at least one product", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        const payload = {
            user_id: customerId,
            orders: selectedProducts.map(p => ({ product_id: p.product_id, quantity: p.quantity })),
            start_date: startDate,
            end_date: endDate
        };

        try {
            await axios.post(`${CONFIG.API_BASE_URL}/orders/modify`, payload);
            toast({ title: "Order modified successfully", status: "success", duration: 3000, isClosable: true });
            fetchOrders();
            onClose();
        } catch (error) {
            toast({ title: "Error modifying order", status: "error", duration: 3000, isClosable: true });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Edit Range</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <FormControl mb={4}>
                        <FormLabel>From Date</FormLabel>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </FormControl>
                    <FormControl mb={4}>
                        <FormLabel>To Date</FormLabel>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </FormControl>
                    <MyComponent
                        key={customerId}
                        products={products}
                        selectedProduct={selectedProduct}
                        setSelectedProduct={setSelectedProduct}
                        selectedQuantity={selectedQuantity}
                        setSelectedQuantity={setSelectedQuantity}
                    />

                    <Button leftIcon={<FaPlus />} colorScheme="green" mt={2} onClick={handleAddProduct}>
                        Add Product
                    </Button>
                    {selectedProducts.length > 0 && (
                        <Box>
                            <Table variant="striped" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Product</Th>
                                        <Th>Quantity</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {selectedProducts.map(product => (
                                        <Tr key={product.product_id}>
                                            <Td>{product.product_name}</Td>
                                            <Td>
                                                
                                                    <NumberInput
                                                        min={1}
                                                        max={100}
                                                        value={product.quantity}
                                                        onChange={(valueString, valueNumber) =>
                                                            setSelectedProducts(prev =>
                                                                prev.map(p =>
                                                                    p.product_id === product.product_id
                                                                        ? { ...p, quantity: valueNumber }
                                                                        : p
                                                                )
                                                            )
                                                        }
                                                    >
                                                        <NumberInputField />
                                                        <NumberInputStepper>
                                                            <NumberIncrementStepper />
                                                            <NumberDecrementStepper />
                                                        </NumberInputStepper>
                                                    </NumberInput>
                                               

                                            </Td>
                                            <Td>
                                                <IconButton
                                                    icon={<FaTrash />}
                                                    colorScheme="red"
                                                    size="sm"
                                                    onClick={() => handleRemoveProduct(product.product_id)}
                                                />
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose} mr={3}>
                        Cancel
                    </Button>
                    <Button colorScheme="blue" onClick={handleModifyOrder}>
                        Modify Order
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default EditOrderModal;
