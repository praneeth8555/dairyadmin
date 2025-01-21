import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Heading, Image, Grid, Text } from "@chakra-ui/react";
//import backgroundImage from "../images/bg0.png";
import bg2 from "../images/mngprofin.png";
import bg3 from "../images/mngorders.png";
import bg4 from "../images/mngcustomers.png";
import bg5 from "../images/dailyordr.png";
import bg6 from "../images/mnthlybllng.png";

const ManagementPanel = () => {
    const navigate = useNavigate();

    const buttons = [
        { label: "Manage Products", image: bg2, path: "/products" },
        { label: "Manage Customers", image: bg4, path: "/customers" },
        { label: "Manage Orders", image: bg3, path: "/orders" },
        { label: "Daily Order Summary", image: bg5, path: "/summary" },
        { label: "Monthly Billing", image: bg6, path: "/billing" },
    ];

    return (
        <Box
        // bgImage={`url(${backgroundImage})`}
        // bgSize="cover"
        // bgPosition="center"
        // minH="100vh"
        px={4}
        py={4}
        >
            <Box textAlign="center" mb={8}>
                <Heading color="blue.800">Admin Management Panel</Heading>
            </Box>
            <Grid
                templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }}
                gap={4} // Reduce gap for a more compact layout
                justifyContent="center"
            >
                {buttons.map((button) => (
                    <Box
                        key={button.label}
                        textAlign="center"
                        cursor="pointer"
                        onClick={() => navigate(button.path)}
                        transition="transform 0.2s"
                        _hover={{ transform: "scale(1.05)" }}
                    >
                        <Box
                            w="50%" // Adjust width to make the items smaller
                            mx="auto" // Center items within their container
                            position="relative"
                            paddingBottom="50%" // Keeps the box square but smaller
                            overflow="hidden"
                            borderRadius="14%"
                            boxShadow="lg" // Added shadow to the box
                            _hover={{ boxShadow: "xl" }} // Hover effect for shadow
                        >
                            <Image
                                src={button.image}
                                alt={button.label}
                                position="absolute"
                                top="0"
                                left="0"
                                width="100%"
                                height="100%"
                                objectFit="cover"
                            />
                        </Box>
                        <Text fontSize="md" fontWeight="semibold" color="blue.700" mt={2}>
                            {button.label}
                        </Text>
                    </Box>
                ))}
            </Grid>




        </Box>
    );
};

export default ManagementPanel;
