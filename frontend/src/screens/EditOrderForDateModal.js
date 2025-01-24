import React, { useState, useEffect} from "react";
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
    // FormControl,
    // FormLabel,
    // Select,
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
import { FaTrash, FaPlus } from "react-icons/fa";
import axios from "axios";
import MyComponent from "./MyComponent";
import CONFIG from "../config";
const EditOrderForDateModal = ({ isOpen, onClose, customerId, orderDate, orderProducts, fetchOrders }) => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const toast = useToast();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/products`);
                setProducts(response.data);

                // Map existing order products
                if (isOpen && orderProducts && orderProducts.length > 0) {
                    const enrichedProducts = orderProducts.map(orderProduct => {
                        const productDetails = response.data.find(
                            p => p.product_id === orderProduct.product_id
                        );
                        return {
                            ...productDetails,
                            quantity: orderProduct.quantity
                        };
                    });

                    setSelectedProducts(enrichedProducts);
                }
            } catch (error) {
                toast({
                    title: "Error fetching products",
                    status: "error",
                    duration: 3000,
                    isClosable: true
                });
            }
        };

        if (isOpen) {
            fetchProducts();
            setSelectedProduct('');  // Reset to empty string
            setSelectedQuantity(1);
        }
    }, [isOpen, orderProducts, toast]);
    const handleAddProduct = () => {
        console.log('Selected Product:', selectedProduct);
        console.log('Available Products:', products);
        if (!selectedProduct) {
            toast({ title: "Please select a product", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        const existingProduct = selectedProducts.find((p) => p.product_id === selectedProduct);

        if (existingProduct) {
            toast({ title: "Product already added", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        const productDetails = products.find((p) => p.product_id === selectedProduct);
        if (!productDetails) {
            toast({ title: "Invalid product selection. Please refresh and try again.", status: "error" });
            return;
        }

        setSelectedProducts(prev => [
            ...prev,
            { ...productDetails, quantity: selectedQuantity } // ✅ Store full product info
        ]);
        setSelectedProduct(null);
        setSelectedQuantity(1);
    };

    const handleRemoveProduct = (productId) => {
        setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
    };

    const handleEditOrder = async () => {
        if (selectedProducts.length === 0) {
            toast({ title: "Please add at least one product", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        const payload = {
            user_id: customerId,
            orders: selectedProducts.map(p => ({ product_id: p.product_id, quantity: p.quantity })),
            start_date: orderDate, // ✅ Use the same date for start and end
            end_date: orderDate
        };

        try {
            await axios.post(`${CONFIG.API_BASE_URL}/orders/modify`, payload);
            toast({ title: "Order updated successfully", status: "success", duration: 3000, isClosable: true });
            fetchOrders();
            onClose();
        } catch (error) {
            toast({ title: "Error updating order", status: "error", duration: 3000, isClosable: true });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Edit Order for {orderDate}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <MyComponent
                        key={customerId}
                        products={products}
                        selectedProduct={selectedProduct}
                        setSelectedProduct={setSelectedProduct}
                        selectedQuantity={selectedQuantity}
                        setSelectedQuantity={setSelectedQuantity}
                    />
                    <Button leftIcon={<FaPlus />} colorScheme="green" onClick={handleAddProduct} mt={2}>
                        Add Product
                    </Button>

                    {selectedProducts.length > 0 && (
                        <Box mt={4}>
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
                                                <IconButton icon={<FaTrash />} colorScheme="red" size="sm" onClick={() => handleRemoveProduct(product.product_id)} />
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose} mr={3}>Cancel</Button>
                    <Button colorScheme="blue" onClick={handleEditOrder}>Edit Order</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default EditOrderForDateModal;
