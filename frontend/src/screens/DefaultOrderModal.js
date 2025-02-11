import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
    useToast,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
} from "@chakra-ui/react";
import { FaTrash, FaPlus } from "react-icons/fa";
import axios from "axios";
import MyComponent from "./MyComponent";

import CONFIG from "../config"; // Assuming API base URL is in config.js

const DefaultOrderModal = ({ isOpen, onClose, customerId }) => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [defaultOrder, setDefaultOrder] = useState([]);
    const [existingOrder, setExistingOrder] = useState(false);
    const toast = useToast();

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/products`);
                setProducts(response.data);
            } catch (error) {
                toast({ title: "Error fetching products", status: "error" });
            }
        };

        fetchProducts();
    }, [toast]);

    // Fetch default order for the customer
    useEffect(() => {
        if (!customerId) return;

        setSelectedProduct(null);
        setSelectedQuantity(1);
        setDefaultOrder([]);

        const fetchDefaultOrder = async () => {
            try {
                const response = await axios.get(
                    `${CONFIG.API_BASE_URL}/customers/${customerId}/default-order`
                );
                if (response.data.products && response.data.products.length > 0) {
                    setDefaultOrder(response.data.products);
                    setExistingOrder(true);
                } else {
                    setDefaultOrder([]);
                    setExistingOrder(false);
                }
            } catch (error) {
                setDefaultOrder([]);
                setExistingOrder(false);
            }
        };

        fetchDefaultOrder();
    }, [customerId]);

    // Add product to default order
    const addProductToOrder = () => {
        if (!selectedProduct) {
            toast({ title: "Please select a product", status: "warning" });
            return;
        }

        if (!Array.isArray(products) || products.length === 0) {
            toast({ title: "Product list is empty. Please try again later.", status: "error" });
            return;
        }

        if (!Array.isArray(defaultOrder)) {
            setDefaultOrder([]);
            return;
        }

        const existingProduct = defaultOrder.find((p) => p.product_id === selectedProduct);
        if (existingProduct) {
            toast({ title: "Product already added", status: "warning" });
            return;
        }

        const productDetails = products.find((p) => p.product_id === selectedProduct);
        if (!productDetails) {
            toast({ title: "Invalid product selection. Please refresh and try again.", status: "error" });
            return;
        }

        setDefaultOrder((prevOrder) => [
            ...prevOrder,
            { ...productDetails, quantity: selectedQuantity },
        ]);
        setSelectedProduct("");
        setSelectedQuantity(1);
    };

    // Remove product from default order
    const removeProduct = (productId) => {
        setDefaultOrder(defaultOrder.filter((product) => product.product_id !== productId));
    };

    // Save default order (create/update)
    const saveDefaultOrder = async () => {
        if (defaultOrder.length === 0) {
            toast({ title: "No products selected", status: "warning" });
            return;
        }

        const payload = {
            products: defaultOrder.map((product) => ({
                product_id: product.product_id,
                quantity: product.quantity,
            })),
        };

        try {
            if (existingOrder) {
                await axios.put(`${CONFIG.API_BASE_URL}/customers/${customerId}/default-order`, payload);
                toast({ title: "Default order updated successfully!", status: "success" });
            } else {
                await axios.post(`${CONFIG.API_BASE_URL}/customers/${customerId}/default-order`, payload);
                toast({ title: "Default order created successfully!", status: "success" });
                setExistingOrder(true);
            }
            const response = await axios.get(`${CONFIG.API_BASE_URL}/customers/${customerId}/default-order`);
            if (response.data.products && response.data.products.length > 0) {
                setDefaultOrder(response.data.products);
            } else {
                setDefaultOrder([]);
            }
            onClose();
        } catch (error) {
            toast({ title: "Failed to save default order", status: "error" });
        }
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{existingOrder ? "Edit Default Order" : "Create Default Order"}</ModalHeader>
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

                    <Button leftIcon={<FaPlus />} colorScheme="green" mt={2} onClick={addProductToOrder}>
                        Add Product
                    </Button>
                    {Array.isArray(defaultOrder) && defaultOrder.length > 0 && (
                        <div style={{ maxHeight: "300px", overflowY: "auto", marginTop: "16px" }}>
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Product Image</Th>
                                        <Th>Product</Th>
                                        <Th>Quantity</Th>
                                        <Th>Action</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {defaultOrder.map((orderItem) => {
                                        const product = products.find((p) => p.product_id === orderItem.product_id);
                                        return (
                                            <Tr key={orderItem.product_id}>
                                                <Td>
                                                    {product && product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name || "Product Image"}
                                                            style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }}
                                                        />
                                                    ) : (
                                                        "Error loading"
                                                    )}
                                                </Td>

                                                <Td>{product ? `${product.product_name} (${product.unit})` : "Unknown Product"}</Td>

                                                <Td>
                                                    <NumberInput
                                                        min={1}
                                                        max={100}
                                                        value={orderItem.quantity}
                                                        onChange={(valueString, valueNumber) =>
                                                            setDefaultOrder(prev =>
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
                                                        onClick={() => removeProduct(orderItem.product_id)}
                                                    />
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </div>
                    )}

                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="red" mr={3} onClick={onClose}>Back</Button>
                    <Button colorScheme="blue" onClick={saveDefaultOrder}>
                        {existingOrder ? "Update Default Order" : "Create Default Order"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default DefaultOrderModal;
