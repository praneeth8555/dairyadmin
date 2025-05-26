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
    // Select,
    useToast,
    Switch,
} from "@chakra-ui/react";
import { FaTrash, FaPlus } from "react-icons/fa";
import axios from "axios";
import MyComponent from "./MyComponent";
import CONFIG from "../config";

const EditOrderModal = ({ isOpen, onClose, customerId, fetchOrders }) => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [selectedDayType, setSelectedDayType] = useState("ODD");
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isAlternatingOrder, setIsAlternatingOrder] = useState(false);
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
            setSelectedDayType("ODD");
        }
    }, [isOpen]);

    const handleAddProduct = () => {
        if (!selectedProduct) {
            toast({ title: "Please select a product", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        const existingProduct = selectedProducts.find((p) =>
            isAlternatingOrder
                ? p.product_id === selectedProduct && p.day_type === selectedDayType
                : p.product_id === selectedProduct
        );
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
            {
                ...productDetails, quantity: selectedQuantity,
                ...(isAlternatingOrder ? { day_type: selectedDayType } : {}),
            },
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
            start_date: startDate,
            end_date: endDate,
            products: selectedProducts.map(p => ({
                product_id: p.product_id,
                quantity: p.quantity,
                ...(isAlternatingOrder ? { day_type: p.day_type || "ODD" } : {})
            }))
        };

        const url = isAlternatingOrder
            ? `${CONFIG.API_BASE_URL}/orders/modify-alternating`
            : `${CONFIG.API_BASE_URL}/orders/modify`;

        try {
            await axios.post(url, payload);
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
                    <FormControl display="flex" alignItems="center" mb={4}>
                        <FormLabel htmlFor="alt-toggle" mb="0">Use Alternating Default Order?</FormLabel>
                        <Switch id="alt-toggle" isChecked={isAlternatingOrder} onChange={(e) => setIsAlternatingOrder(e.target.checked)} />
                    </FormControl>
                    {/* {isAlternatingOrder && (
                        <FormControl mb={4}>
                            <FormLabel>Day Type</FormLabel>
                            <Select value={selectedDayType} onChange={e => setSelectedDayType(e.target.value)}>
                                <option value="ODD">ODD</option>
                                <option value="EVEN">EVEN</option>
                                <option value="CUSTOM">CUSTOM</option>
                            </Select>
                        </FormControl>
                    )} */}
                    <MyComponent
                        key={customerId}
                        products={products}
                        selectedProduct={selectedProduct}
                        setSelectedProduct={setSelectedProduct}
                        selectedQuantity={selectedQuantity}
                        setSelectedQuantity={setSelectedQuantity}
                        isAlternatingOrder={isAlternatingOrder}
                        selectedDayType={selectedDayType}
                        setSelectedDayType={setSelectedDayType}
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
                                        {isAlternatingOrder && <Th>Day Type</Th>}
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {selectedProducts.map(product => (
                                        <Tr key={isAlternatingOrder ? `${product.day_type === 'EVEN' ? '1' : '0'}_${product.product_id}` : product.product_id}>
                                            <Td>{product ? `${product.product_name} (${product.unit})` : "Unknown Product"}</Td>
                                            <Td>
                                                <NumberInput
                                                    min={1}
                                                    max={100}
                                                    value={product.quantity}
                                                    onChange={(valueString, valueNumber) =>
                                                        setSelectedProducts(prev =>
                                                            prev.map(p =>
                                                                (isAlternatingOrder
                                                                    ? p.product_id === product.product_id && p.day_type === product.day_type
                                                                    : p.product_id === product.product_id)
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
                                            {/* {isAlternatingOrder && <Td>{product.day_type}</Td>} */}

                                            {isAlternatingOrder && (
                                                <Td>
                                                    <select
                                                        value={product.day_type || "ODD"}
                                                        onChange={(e) =>
                                                            setSelectedProducts(prev =>
                                                                prev.map(p =>
                                                                    p.product_id === product.product_id
                                                                        ? { ...p, day_type: e.target.value }
                                                                        : p
                                                                )
                                                            )
                                                        }
                                                    >
                                                        <option value="ODD">ODD</option>
                                                        <option value="EVEN">EVEN</option>
                                                        {/* <option value="CUSTOM">CUSTOM</option> */}
                                                    </select>
                                                </Td>
                                            )}
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
                        {isAlternatingOrder ? "Modify Alternating Order" : "Modify Order"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default EditOrderModal;
