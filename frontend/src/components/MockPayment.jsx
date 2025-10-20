import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, CreditCard, ArrowLeft } from 'lucide-react';

const MockPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  
  const orderId = searchParams.get('order');
  const amount = parseFloat(searchParams.get('amount') || '0');

  const handlePayment = async (success = true) => {
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      const status = success ? 'success' : 'failed';
      const response = await fetch(`/api/payment-success?order=${orderId}&status=${status}`);
      const result = await response.json();
      
      setProcessing(false);
      
      // Show result and redirect
      if (success) {
        alert('✅ Payment Successful! You will receive confirmation on WhatsApp.');
      } else {
        alert('❌ Payment Failed! Please try again.');
      }
      
      // Redirect to a thank you page or close window
      window.close();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 glass">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              🧪 Test Payment Gateway
            </CardTitle>
            <CardDescription>
              Mock payment system for testing (Until Oct 23rd)
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Order Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono font-medium">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-green-600 text-lg">₹{amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Merchant:</span>
                  <span className="font-medium">Fresh Dairy</span>
                </div>
              </div>
            </div>

            {/* Payment Simulation Notice */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Badge className="bg-blue-500 text-white">Test Mode</Badge>
                <span className="text-sm font-medium text-blue-800">Simulation</span>
              </div>
              <p className="text-sm text-blue-700">
                This is a mock payment gateway for testing. Once Razorpay API keys are available (Oct 23rd), 
                this will be replaced with real payment processing.
              </p>
            </div>

            {/* Payment Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => handlePayment(true)}
                disabled={processing}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium"
              >
                {processing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Simulate Successful Payment
                  </div>
                )}
              </Button>

              <Button
                onClick={() => handlePayment(false)}
                disabled={processing}
                variant="outline"
                className="w-full h-12 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Simulate Failed Payment
              </Button>
            </div>

            {/* Information */}
            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-500 mb-3">
                Secure payment powered by Fresh Dairy Test Gateway
              </p>
              
              <div className="space-y-1 text-xs text-gray-400">
                <p>🔒 SSL Encrypted</p>
                <p>🛡️ PCI DSS Compliant (Simulation)</p>
                <p>📞 Support: +91 90075 09919</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MockPayment;