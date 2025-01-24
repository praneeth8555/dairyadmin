import React, { useState } from "react";
import { Box, Button, FormControl, FormLabel, Input, Heading, Text, VStack, useToast } from "@chakra-ui/react";
import axios from "axios";
import CONFIG from '../config';

import backgroundImage from "../images/img2.jpg"

const AdminLogin = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const toast = useToast();
    //dotenv.config()
    // Dynamically set the API base URL
   
    
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const response = await axios.post(`${CONFIG.API_BASE_URL}/admin/login`, {
                Username: username,
                Password: password,
            });

            localStorage.setItem("token", response.data.token);
            toast({
                title: "Login Successful",
                description: "Welcome back!",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            window.location.href = "/managementpanel";
        } catch (err) {
            console.log(err)
            setError("Invalid credentials. Please try again.");
            toast({
                title: "Login Failed",
                description: "Invalid username or password.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return (
        <Box
            bgImage={`url(${backgroundImage})`}
            bgSize="cover"
            bgPosition="center"
            minH="100vh"
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={4}
        >
            <Box
                bg="white"
                rounded="lg"
                shadow="lg"
                p={8}
                maxW="md"
                w="100%"
            >
                <Heading textAlign="center" mb={6} color="#0B89D7">
                    Admin Login
                </Heading>

                {error && (
                    <Text color="red.500" mb={4} fontWeight="semibold" textAlign="center">
                        {error}
                    </Text>
                )}

                <form onSubmit={handleLogin}>
                    <VStack spacing={4}>
                        <FormControl isRequired>
                            <FormLabel>Username</FormLabel>
                            <Input
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                focusBorderColor="#0B89D7"
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                focusBorderColor="#0B89D7"
                            />
                        </FormControl>

                        <Button
                            type="submit"
                            colorScheme="blue"
                            width="full"
                            mt={4}
                        >
                            Login
                        </Button>
                    </VStack>
                </form>
            </Box>
        </Box>
    );
};

export default AdminLogin;
