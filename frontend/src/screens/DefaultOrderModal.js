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
} from "@chakra-ui/react";
import { FaTrash, FaPlus } from "react-icons/fa";
import axios from "axios";
import MyComponent from "./MyComponent";

const DefaultOrderModal = ({ isOpen, onClose, customerId }) => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [defaultOrder, setDefaultOrder] = useState([]);
    const [existingOrder, setExistingOrder] = useState(false);
    const toast = useToast();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get("http://localhost:8080/products");
                setProducts(response.data);
            } catch (error) {
                toast({ title: "Error fetching products", status: "error" });
            }
        };

        fetchProducts();
    }, [toast]);

    useEffect(() => {
        if (!customerId) return;

        setSelectedProduct(null);
        setSelectedQuantity(1);
        setDefaultOrder([]);

        const fetchDefaultOrder = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/customers/${customerId}/default-order`);
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
    }, [customerId, setDefaultOrder]);

    const addProductToOrder = () => {
        if (!selectedProduct) {
            toast({ title: "Please select a product", status: "warning" });
            return;
        }

        if (!Array.isArray(products) || products.length === 0) {
            toast({ title: "Product list is empty or not loaded. Please try again later.", status: "error" });
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

        setDefaultOrder((prevOrder) => [...prevOrder, { ...productDetails, quantity: selectedQuantity }]);
        setSelectedProduct("");
        setSelectedQuantity(1);
    };

    const removeProduct = (productId) => {
        setDefaultOrder(defaultOrder.filter((product) => product.product_id !== productId));
    };

    const saveDefaultOrder = async () => {
        if (defaultOrder.length === 0) {
            toast({ title: "No products selected", status: "warning" });
            return;
        }
        console.log(defaultOrder)
        const payload = {
            
            products: defaultOrder.map((product) => ({
                product_id: product.product_id,
                quantity: product.quantity,
            })),
        };

        try {
            if (existingOrder) {
                await axios.put(`http://localhost:8080/customers/${customerId}/default-order`, payload);
                
                toast({ title: "Default order updated successfully!", status: "success" });
            } else {
                await axios.post(`http://localhost:8080/customers/${customerId}/default-order`, payload);
                toast({ title: "Default order created successfully!", status: "success" });
                setExistingOrder(true);
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
                        <Table variant="simple" mt={4}>
                            <Thead>
                                <Tr>
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
                                            <Td>{product ? product.product_name +" ("+product.unit+")": "Unknown Product"}</Td>
                                            <Td>{orderItem.quantity}</Td>
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
