import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Button,
    Input,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    useDisclosure,
    useToast,
    Box,
    Text,
    Image,
    IconButton,
    Flex,
    Grid,
    Alert,
    AlertIcon,
    Heading,
    VStack,
    Center,
    InputGroup,
    InputLeftElement,
    useBreakpointValue

} from "@chakra-ui/react";
import { FaEdit, FaTrash, FaSearch, FaArrowLeft,FaPlus } from "react-icons/fa";
import { FaMoneyBillTrendUp } from "react-icons/fa6";
import PriceHistory from "./PriceHistory";
import { useNavigate } from "react-router-dom";
import CONFIG from "../config";
const ProductManagement = () => {
    const navigate=useNavigate()
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ name: "", unit: "", price: "", image: null });
    const [editProduct, setEditProduct] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${CONFIG.API_BASE_URL}/products`);
            if (Array.isArray(response.data)) {
                setProducts(response.data);
            }
        } catch (error) {
            console.error("Error fetching products", error);
        }
    };

    // Utility function to handle image upload
    const postDetails = async (file) => {
        if (!file || (file.type !== "image/jpeg" && file.type !== "image/png")) {
            toast({
                title: "Invalid image type",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
            throw new Error("Invalid image type");
        }

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "chatfusion");
        data.append("cloud_name", "dzrcalore");

        try {
            setIsUploading(true);
            const response = await fetch("https://api.cloudinary.com/v1_1/dzrcalore/image/upload", {
                method: "POST",
                body: data,
            });
            const result = await response.json();
            if (result?.url) {
                return result.url;
            } else {
                throw new Error("Failed to upload image");
            }
        } catch (error) {
            console.error("Error uploading image", error);
            toast({
                title: "Error uploading image",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    const addProduct = async () => {
        if (!newProduct.name || !newProduct.unit || !newProduct.price || !newProduct.image) {
            toast({
                title: "All fields are required",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        try {
            const imageUrl = await postDetails(newProduct.image);
            await axios.post(`${CONFIG.API_BASE_URL}/products`, {
                product_name: newProduct.name,
                unit: newProduct.unit,
                current_price: parseFloat(newProduct.price),
                image_url: imageUrl,
            });
            setNewProduct({ name: "", unit: "", price: "", image: null });
            fetchProducts();
            onClose();
            toast({
                title: "Product added successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error("Error adding product", error);
        }
    };

    const editProductDetails = async () => {
        if (!editProduct.product_name || !editProduct.unit || !editProduct.current_price) {
            toast({
                title: "All fields are required",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        try {
            let imageUrl = editProduct.image_url;

            // If a new image is provided, upload it
            if (editProduct.image) {
                imageUrl = await postDetails(editProduct.image);
            }

            await axios.put(`${CONFIG.API_BASE_URL}/products/${editProduct.product_id}`, {
                product_name: editProduct.product_name,
                unit: editProduct.unit,
                current_price: parseFloat(editProduct.current_price),
                image_url: imageUrl,
                effective_from: editProduct.effectiveFrom,
            });

            fetchProducts();
            onClose();
            toast({
                title: "Product updated successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error("Error editing product", error);
        }
    };

    const deleteProduct = async (id) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this product?");
        if (confirmDelete) {
            try {
                await axios.delete(`${CONFIG.API_BASE_URL}/products/${id}`);
                fetchProducts();
                toast({
                    title: "Product deleted successfully",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            } catch (error) {
                console.error("Error deleting product", error);
            }
        }
    };
    const filteredProducts = products.filter((product) =>
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const openPriceHistory = (productId) => {
        setSelectedProduct(productId);
        setIsPriceHistoryOpen(true);
    };
    const addButtonText = useBreakpointValue({
        base: <FaPlus />,  // ✅ Show "+" on mobile
        md: "Add New Product" // ✅ Show text on desktops
    });
    return (
        <Box p={8} bg="gray.50" minH="100vh">
            <Flex align="center" mb={4}>
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
                    Product Management
                </Heading>
            </Flex>
            <Flex mb={6} justify="center" align="center" gap={4}>
                <InputGroup maxW="400px">
                    <InputLeftElement pointerEvents="none">
                        <FaSearch color="gray.500" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search products by name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        borderColor="teal.500"        // Sets the default border color
                        focusBorderColor="teal.500"
                    />
                </InputGroup>

                <Button colorScheme="teal" onClick={onOpen}>
                    {typeof addButtonText === "string" ? addButtonText : <FaPlus />}
                </Button>
            </Flex>
            <Grid
                templateColumns={{
                    base: "1fr", // Single column for mobile view
                    md: "repeat(auto-fit, minmax(250px, 1fr))", // Original layout for desktop
                }}
                gap={4}
                p={2}
                justifyItems="center"
            >
                {filteredProducts.length === 0 ? (
                    <Center w="100%" h="200px">
                        <VStack>
                            <Alert status="info" borderRadius="md">
                                <AlertIcon />
                                No products available.
                            </Alert>
                            <Text color="gray.500">Click "Add New Product" to start.</Text>
                        </VStack>
                    </Center>
                ) : (
                    filteredProducts.map((product) => (
                        <Box
                            key={product.product_id}
                            bgColor="#78BCC4"
                            p={4}
                            borderRadius="md"
                            transition="all 0.3s ease"
                            _hover={{
                                shadow: "lg",
                                transform: "scale(1.05)",
                            }}
                            display="flex"
                            flexDirection={{
                                base: "row", // Side by side on mobile
                                md: "column", // Stacked on desktop
                            }}
                            alignItems="center"
                            gap={4}
                            w="100%"
                        >
                            <Image
                                src={product.image_url}
                                alt={product.product_name}
                                borderRadius="md"
                                objectFit="cover"
                                outlineColor="white"
                                borderColor="white"
                                box-shadow=" rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px"
                                boxSize={{
                                    base: "100px",  // Reduce image size for mobile
                                    md: "200px",
                                }}
                            />
                            <Box flex="1" display="flex" flexDirection="column">
                                <Text
                                    fontWeight="bold"
                                    fontSize={{
                                        base: "sm",  // Smaller font on mobile
                                        md: "lg",    // Larger font on desktop
                                    }}
                                    color="#002C3E"
                                >
                                    {product.product_name}
                                </Text>
                                <Text
                                    color="#0E3746"
                                    fontSize={{
                                        base: "xs",  // Smaller text for unit on mobile
                                        md: "md",    // Normal text on desktop
                                    }}
                                >
                                    {product.unit}
                                </Text>
                                <Text
                                    color="#0E3746"
                                    fontWeight="bold"
                                    fontSize={{
                                        base: "md",  // Medium size for price on mobile
                                        md: "xl",    // Larger on desktop
                                    }}
                                >
                                    ₹{product.current_price}
                                </Text>

                                {/* Edit/Delete buttons BELOW Info */}
                                <Flex
                                    justifyContent="center"
                                    gap={2}
                                    mt={3}
                                    w="full"
                                >
                                    <IconButton
                                        icon={<FaMoneyBillTrendUp />}
                                        aria-label="Track Price History"
                                        onClick={() => openPriceHistory(product.product_id)}
                                        size={{
                                            base: "sm",  // Small button for mobile
                                            md: "md",    // Normal button for desktop
                                        }}
                                    />
                                    <IconButton
                                        icon={<FaEdit />}
                                        aria-label="Edit"
                                        onClick={() => { setEditProduct(product); onOpen(); }}
                                        size={{
                                            base: "sm",  // Small button for mobile
                                            md: "md",    // Normal button for desktop
                                        }}
                                    />
                                    <IconButton
                                        icon={<FaTrash />}
                                        aria-label="Delete"
                                        onClick={() => deleteProduct(product.product_id)}
                                        size={{
                                            base: "sm",  // Small button for mobile
                                            md: "md",    // Normal button for desktop
                                        }}
                                    />
                                </Flex>
                            </Box>
                        </Box>



                    ))
                )}
            </Grid>
            {/* PriceHistory Modal */}
            <PriceHistory
                productId={selectedProduct}
                isOpen={isPriceHistoryOpen}
                onClose={() => setIsPriceHistoryOpen(false)}
            />
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{editProduct ? "Edit Product" : "Add New Product"}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Input
                            placeholder="Product Name"
                            mb={3}
                            value={editProduct ? editProduct.product_name : newProduct.name}
                            onChange={(e) =>
                                editProduct
                                    ? setEditProduct({ ...editProduct, product_name: e.target.value })
                                    : setNewProduct({ ...newProduct, name: e.target.value })
                            }
                        />
                        <Input
                            placeholder="Unit (e.g., liters, kg)"
                            mb={3}
                            value={editProduct ? editProduct.unit : newProduct.unit}
                            onChange={(e) =>
                                editProduct
                                    ? setEditProduct({ ...editProduct, unit: e.target.value })
                                    : setNewProduct({ ...newProduct, unit: e.target.value })
                            }
                        />
                        <Input
                            placeholder="Price"
                            type="number"
                            mb={3}
                            value={editProduct ? editProduct.current_price : newProduct.price}
                            onChange={(e) =>
                                editProduct
                                    ? setEditProduct({ ...editProduct, current_price: e.target.value })
                                    : setNewProduct({ ...newProduct, price: e.target.value })
                            }
                        />
                        <Input
                            type="date"
                            mb={3}
                            value={editProduct ? editProduct.effectiveFrom || "" : ""}
                            onChange={(e) =>
                                editProduct
                                    ? setEditProduct({ ...editProduct, effectiveFrom: e.target.value })
                                    : null
                            }
                        />


                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                editProduct
                                    ? setEditProduct({ ...editProduct, image: e.target.files[0] })
                                    : setNewProduct({ ...newProduct, image: e.target.files[0] })
                            }
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            colorScheme="teal"
                            mr={3}
                            isLoading={isUploading}
                            onClick={editProduct ? editProductDetails : addProduct}
                        >
                            {editProduct ? "Save Changes" : "Add Product"}
                        </Button>
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
};

export default ProductManagement;
