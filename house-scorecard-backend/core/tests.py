from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from .models import Property, Criterion, Rating


class PropertyModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        
    def test_property_creation(self):
        property_obj = Property.objects.create(
            owner=self.user,
            address='123 Test St',
            price=Decimal('300000.00'),
            beds=3,
            baths=Decimal('2.5'),
            sqft=1500
        )
        self.assertEqual(property_obj.address, '123 Test St')
        self.assertEqual(property_obj.owner, self.user)
        self.assertEqual(property_obj.price, Decimal('300000.00'))
        
    def test_property_score_calculation_with_deal_breaker(self):
        property_obj = Property.objects.create(owner=self.user, address='123 Test St')
        criterion = Criterion.objects.create(
            owner=self.user,
            text='Must have parking',
            type='dealBreaker'
        )
        Rating.objects.create(
            property=property_obj,
            criterion=criterion,
            value='yes'
        )
        self.assertEqual(property_obj.score, 0)
        
    def test_property_score_calculation_with_must_have_fail(self):
        property_obj = Property.objects.create(owner=self.user, address='123 Test St')
        criterion = Criterion.objects.create(
            owner=self.user,
            text='Must have 2 bedrooms',
            type='mustHave'
        )
        Rating.objects.create(
            property=property_obj,
            criterion=criterion,
            value='no'
        )
        self.assertEqual(property_obj.score, 0)
        
    def test_property_score_calculation_nice_to_have(self):
        property_obj = Property.objects.create(owner=self.user, address='123 Test St')
        criterion = Criterion.objects.create(
            owner=self.user,
            text='Good neighborhood',
            type='niceToHave',
            weight=8,
            rating_type='stars'
        )
        Rating.objects.create(
            property=property_obj,
            criterion=criterion,
            value='4'
        )
        # 4 stars -> (4-1) * 2.5 = 7.5/10, weighted by 8, normalized to 100
        expected_score = int(round((7.5 * 8) / (8 * 10) * 100))
        self.assertEqual(property_obj.score, expected_score)


class CriterionModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        
    def test_criterion_creation(self):
        criterion = Criterion.objects.create(
            owner=self.user,
            text='Good schools nearby',
            type='niceToHave',
            weight=7,
            rating_type='stars'
        )
        self.assertEqual(criterion.text, 'Good schools nearby')
        self.assertEqual(criterion.type, 'niceToHave')
        self.assertEqual(criterion.weight, 7)
        self.assertEqual(criterion.rating_type, 'stars')
        
    def test_criterion_str_method(self):
        criterion = Criterion.objects.create(
            owner=self.user,
            text='Must have garage',
            type='mustHave'
        )
        self.assertEqual(str(criterion), 'Must-Have: Must have garage')


class PropertyAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
    def test_create_property(self):
        data = {
            'address': '456 API Test St',
            'price': '250000.00',
            'beds': 2,
            'baths': '1.5',
            'sqft': 1200,
            'notes': 'Test property'
        }
        response = self.client.post('/api/properties/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Property.objects.count(), 1)
        property_obj = Property.objects.get()
        self.assertEqual(property_obj.address, '456 API Test St')
        self.assertEqual(property_obj.owner, self.user)
        
    def test_get_properties(self):
        Property.objects.create(
            owner=self.user,
            address='123 Get Test St',
            price=Decimal('300000.00')
        )
        response = self.client.get('/api/properties/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
    def test_update_property(self):
        property_obj = Property.objects.create(
            owner=self.user,
            address='123 Update Test St',
            price=Decimal('300000.00')
        )
        data = {
            'address': '123 Updated Test St',
            'price': '350000.00'
        }
        response = self.client.patch(f'/api/properties/{property_obj.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.address, '123 Updated Test St')
        self.assertEqual(property_obj.price, Decimal('350000.00'))
        
    def test_delete_property(self):
        property_obj = Property.objects.create(
            owner=self.user,
            address='123 Delete Test St'
        )
        response = self.client.delete(f'/api/properties/{property_obj.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Property.objects.count(), 0)
        
    def test_property_ownership_isolation(self):
        other_user = User.objects.create_user(username='otheruser', password='testpass')
        Property.objects.create(owner=other_user, address='Other user property')
        
        response = self.client.get('/api/properties/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class CriterionAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
    def test_create_criterion(self):
        data = {
            'text': 'Good public transport',
            'type': 'niceToHave',
            'weight': 6,
            'rating_type': 'yesNo',
            'category': 'Location'
        }
        response = self.client.post('/api/criteria/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Criterion.objects.count(), 1)
        criterion = Criterion.objects.get()
        self.assertEqual(criterion.text, 'Good public transport')
        self.assertEqual(criterion.owner, self.user)
        
    def test_get_criteria(self):
        Criterion.objects.create(
            owner=self.user,
            text='Test criterion',
            type='mustHave'
        )
        response = self.client.get('/api/criteria/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
    def test_update_criterion(self):
        criterion = Criterion.objects.create(
            owner=self.user,
            text='Original text',
            type='niceToHave',
            weight=5
        )
        data = {
            'text': 'Updated text',
            'weight': 8
        }
        response = self.client.patch(f'/api/criteria/{criterion.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        criterion.refresh_from_db()
        self.assertEqual(criterion.text, 'Updated text')
        self.assertEqual(criterion.weight, 8)
        
    def test_delete_criterion(self):
        criterion = Criterion.objects.create(
            owner=self.user,
            text='To be deleted',
            type='niceToHave'
        )
        response = self.client.delete(f'/api/criteria/{criterion.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Criterion.objects.count(), 0)
        
    def test_criterion_ownership_isolation(self):
        other_user = User.objects.create_user(username='otheruser', password='testpass')
        Criterion.objects.create(owner=other_user, text='Other user criterion', type='mustHave')
        
        response = self.client.get('/api/criteria/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class RatingAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.property = Property.objects.create(
            owner=self.user,
            address='123 Rating Test St'
        )
        self.criterion = Criterion.objects.create(
            owner=self.user,
            text='Test criterion',
            type='niceToHave',
            rating_type='stars'
        )
        
    def test_create_rating(self):
        data = {
            'property': self.property.id,
            'criterion': self.criterion.id,
            'value': '4'
        }
        response = self.client.post('/api/ratings/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Rating.objects.count(), 1)
        
    def test_rating_triggers_score_calculation(self):
        Rating.objects.create(
            property=self.property,
            criterion=self.criterion,
            value='3'
        )
        self.property.refresh_from_db()
        self.assertIsNotNone(self.property.score)
        
    def test_unique_rating_per_property_criterion(self):
        Rating.objects.create(
            property=self.property,
            criterion=self.criterion,
            value='3'
        )
        # Try to create duplicate rating
        data = {
            'property': self.property.id,
            'criterion': self.criterion.id,
            'value': '4'
        }
        response = self.client.post('/api/ratings/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_update_rating(self):
        rating = Rating.objects.create(
            property=self.property,
            criterion=self.criterion,
            value='3'
        )
        data = {'value': '5'}
        response = self.client.patch(f'/api/ratings/{rating.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rating.refresh_from_db()
        self.assertEqual(rating.value, '5')


class IntegrationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
    def test_full_property_scoring_workflow(self):
        # Create property
        property_data = {
            'address': '123 Integration Test St',
            'price': '400000.00'
        }
        prop_response = self.client.post('/api/properties/', property_data)
        property_id = prop_response.data['id']
        
        # Create criteria
        must_have_data = {
            'text': 'Must have 2+ bedrooms',
            'type': 'mustHave'
        }
        must_have_response = self.client.post('/api/criteria/', must_have_data)
        must_have_id = must_have_response.data['id']
        
        nice_to_have_data = {
            'text': 'Good neighborhood',
            'type': 'niceToHave',
            'weight': 8,
            'rating_type': 'stars'
        }
        nice_to_have_response = self.client.post('/api/criteria/', nice_to_have_data)
        nice_to_have_id = nice_to_have_response.data['id']
        
        # Rate property
        must_have_rating = {
            'property': property_id,
            'criterion': must_have_id,
            'value': 'yes'
        }
        self.client.post('/api/ratings/', must_have_rating)
        
        nice_to_have_rating = {
            'property': property_id,
            'criterion': nice_to_have_id,
            'value': '4'
        }
        self.client.post('/api/ratings/', nice_to_have_rating)
        
        # Check final score
        prop_response = self.client.get(f'/api/properties/{property_id}/')
        self.assertIsNotNone(prop_response.data['score'])
        self.assertGreater(prop_response.data['score'], 0)
