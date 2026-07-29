import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Crown, User, Scissors, Sparkles, ShieldCheck, Ruler, Package, HeartHandshake, ArrowRight } from 'lucide-react-native'

export default function LandingPageScreen() {
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(500)} style={styles.container}>

          {/* ── En-tête Navigation ── */}
          <View style={styles.navHeader}>
            <View style={styles.headerLogoRow}>
              <View style={styles.logoBox}>
                <Crown size={22} color="#C05A2B" strokeWidth={2} />
              </View>
              <Text style={styles.brandTitle}>ModèlePro</Text>
            </View>

            <TouchableOpacity
              style={styles.loginHeaderBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginHeaderBtnText}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          {/* ── Hero Section ── */}
          <View style={styles.heroBlock}>
            <View style={styles.surtitreBadge}>
              <Sparkles size={12} color="#C05A2B" />
              <Text style={styles.surtitreText}>PLATEFORME D'ARTISANAT DU SÉNÉGAL</Text>
            </View>

            <Text style={styles.heroTitle}>
              L'excellence sur-mesure &{'\n'}l'artisanat d'exception
            </Text>

            <Text style={styles.heroSubtitle}>
              La plateforme n°1 pour commander vos vêtements, coiffures et créations artisanales sur-mesure directement auprès des meilleurs maîtres du Sénégal.
            </Text>

            {/* Boutons d'Action Principaux */}
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.btnClient}
                onPress={() => router.push('/(auth)/register-client')}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Je suis client"
              >
                <User size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.btnClientText}>Je suis client</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnArtisan}
                onPress={() => router.push('/(auth)/register-artisan')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Je suis artisan"
              >
                <Scissors size={18} color="#1A1005" strokeWidth={2} />
                <Text style={styles.btnArtisanText}>Je suis artisan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Section Nos Métiers & Spécialités ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderBlock}>
              <Text style={styles.sectionSurtitre}>NOS SPÉCIALITÉS</Text>
              <Text style={styles.sectionMainTitle}>Découvrez l'artisanat d'art</Text>
              <Text style={styles.sectionSubtitle}>
                Des professionnels passionnés qualifiés dans chaque domaine du sur-mesure.
              </Text>
            </View>

            <View style={styles.craftsGrid}>

              {/* 1. Couture */}
              <View style={styles.craftCard}>
                <View style={styles.craftIconBox}>
                  <Scissors size={24} color="#C05A2B" strokeWidth={2} />
                </View>
                <Text style={styles.craftTitle}>Couture & Haute Couture</Text>
                <Text style={styles.craftDesc}>
                  Bazin riches brodés, Caftans, Costumes sur-mesure, robes de soirée et confections traditionnelles d'exception.
                </Text>
              </View>

              {/* 2. Coiffure */}
              <View style={styles.craftCard}>
                <View style={styles.craftIconBox}>
                  <Sparkles size={24} color="#C05A2B" strokeWidth={2} />
                </View>
                <Text style={styles.craftTitle}>Coiffure & Esthétique</Text>
                <Text style={styles.craftDesc}>
                  Tresses artistiques, coiffures événementielles, soins capillaires et mises en beauté traditionnelles.
                </Text>
              </View>

              {/* 3. Cordonnerie & Maroquinerie */}
              <View style={styles.craftCard}>
                <View style={styles.craftIconBox}>
                  <Crown size={24} color="#C05A2B" strokeWidth={2} />
                </View>
                <Text style={styles.craftTitle}>Cordonnerie & Maroquinerie</Text>
                <Text style={styles.craftDesc}>
                  Chaussures et babouches en cuir véritable fait main, sacs d'artisan, ceintures et articles en cuir façonnés.
                </Text>
              </View>

              {/* 4. Bijouterie & Orfèvrerie */}
              <View style={styles.craftCard}>
                <View style={styles.craftIconBox}>
                  <HeartHandshake size={24} color="#C05A2B" strokeWidth={2} />
                </View>
                <Text style={styles.craftTitle}>Bijouterie & Orfèvrerie</Text>
                <Text style={styles.craftDesc}>
                  Créations en or, filigrane d'argent et parures de perles traditionnelles façonnées par nos maître orfèvres.
                </Text>
              </View>

            </View>
          </View>

          {/* ── Section Pourquoi Choisir ModèlePro ── */}
          <View style={styles.advantagesSection}>
            <Text style={styles.advantagesMainTitle}>Pourquoi choisir ModèlePro ?</Text>

            <View style={styles.advantagesList}>

              <View style={styles.advantageItem}>
                <View style={styles.advantageIconBox}>
                  <ShieldCheck size={20} color="#C05A2B" />
                </View>
                <View style={styles.advantageContent}>
                  <Text style={styles.advantageTitle}>Artisans Certifiés & Vérifiés</Text>
                  <Text style={styles.advantageText}>
                    Tous nos artisans sont sélectionnés pour la qualité éprouvée de leur savoir-faire et évalués par les clients.
                  </Text>
                </View>
              </View>

              <View style={styles.advantageItem}>
                <View style={styles.advantageIconBox}>
                  <Ruler size={20} color="#C05A2B" />
                </View>
                <View style={styles.advantageContent}>
                  <Text style={styles.advantageTitle}>Prise de Mesures Personnalisée</Text>
                  <Text style={styles.advantageText}>
                    Commandez avec vos mensurations exactes pour obtenir un ajustement impeccable et personnalisé.
                  </Text>
                </View>
              </View>

              <View style={styles.advantageItem}>
                <View style={styles.advantageIconBox}>
                  <Package size={20} color="#C05A2B" />
                </View>
                <View style={styles.advantageContent}>
                  <Text style={styles.advantageTitle}>Suivi de Fabrication en Temps Réel</Text>
                  <Text style={styles.advantageText}>
                    Suivez la progression de la confection de votre commande étape par étape jusqu'à la livraison finale.
                  </Text>
                </View>
              </View>

            </View>
          </View>

          {/* ── Footer CTA ── */}
          <View style={styles.footerBlock}>
            <Text style={styles.footerTitle}>Prêt à commencer ?</Text>
            <Text style={styles.footerSub}>
              Rejoignez dès maintenant des milliers de passionnés et d'artisans d'art.
            </Text>

            <View style={styles.footerCtaRow}>
              <TouchableOpacity
                style={styles.footerBtnPrimary}
                onPress={() => router.push('/(auth)/register-client')}
                activeOpacity={0.88}
              >
                <Text style={styles.footerBtnPrimaryText}>Créer mon compte client</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerBtnSecondary}
                onPress={() => router.push('/(auth)/register-artisan')}
                activeOpacity={0.8}
              >
                <Text style={styles.footerBtnSecondaryText}>Rejoindre comme artisan</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.copyrightText}>
              © 2026 ModèlePro — L'artisanat d'excellence au Sénégal
            </Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  container: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  // ── Nav Header ──
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  loginHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  loginHeaderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1005',
  },

  // ── Hero Block ──
  heroBlock: {
    marginBottom: 40,
  },
  surtitreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF4EE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F3D2C1',
    marginBottom: 12,
  },
  surtitreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C05A2B',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.8,
    lineHeight: 42,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#7A6A58',
    lineHeight: 23,
    marginBottom: 24,
  },
  heroActions: {
    gap: 12,
  },
  btnClient: {
    height: 52,
    backgroundColor: '#C05A2B',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#C05A2B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnClientText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnArtisan: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8E2D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnArtisanText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1005',
  },

  // ── Section Crafts ──
  section: {
    marginBottom: 40,
  },
  sectionHeaderBlock: {
    marginBottom: 20,
  },
  sectionSurtitre: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C05A2B',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionMainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1005',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7A6A58',
    lineHeight: 20,
  },
  craftsGrid: {
    gap: 14,
  },
  craftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    gap: 8,
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  craftIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFF4EE',
    borderWidth: 1,
    borderColor: '#F3D2C1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  craftTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1005',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  craftDesc: {
    fontSize: 13,
    color: '#7A6A58',
    lineHeight: 19,
  },

  // ── Section Pourquoi ModèlePro ──
  advantagesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginBottom: 40,
    gap: 20,
  },
  advantagesMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1005',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.4,
  },
  advantagesList: {
    gap: 16,
  },
  advantageItem: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  advantageIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF4EE',
    borderWidth: 1,
    borderColor: '#F3D2C1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  advantageContent: {
    flex: 1,
    gap: 2,
  },
  advantageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1005',
  },
  advantageText: {
    fontSize: 13,
    color: '#7A6A58',
    lineHeight: 18,
  },

  // ── Footer CTA ──
  footerBlock: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
  },
  footerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1005',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  footerSub: {
    fontSize: 14,
    color: '#7A6A58',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  footerCtaRow: {
    width: '100%',
    gap: 10,
  },
  footerBtnPrimary: {
    height: 50,
    backgroundColor: '#C05A2B',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerBtnSecondary: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1005',
  },
  copyrightText: {
    fontSize: 12,
    color: '#A89684',
    marginTop: 20,
    textAlign: 'center',
  },
})
