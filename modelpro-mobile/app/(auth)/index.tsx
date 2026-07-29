import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  ImageBackground,
} from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Crown, User, Scissors, Sparkles, ShieldCheck, Ruler, Package, HeartHandshake, ArrowRight, CheckCircle2 } from 'lucide-react-native'

export default function LandingPageScreen() {
  return (
    <View style={styles.root}>
      {/* Dynamic Background Gradients */}
      <LinearGradient
        colors={['#FFFDF9', '#FAF8F5', '#F5EBE1']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(500)} style={styles.container}>

          {/* ── En-tête Navigation avec Logo Premium ── */}
          <View style={styles.navHeader}>
            <View style={styles.headerLogoRow}>
              <LinearGradient
                colors={['#FFF8F2', '#F5E6D8']}
                style={styles.logoBox}
              >
                <Crown size={24} color="#C05A2B" strokeWidth={2.2} />
              </LinearGradient>
              <View>
                <Text style={styles.brandTitle}>ModèlePro</Text>

              </View>
            </View>

            <TouchableOpacity
              style={styles.loginHeaderBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginHeaderBtnText}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          {/* ── Hero Card avec Image de Fond & Overlay ── */}
          <View style={styles.heroCardContainer}>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1000&q=80' }}
              style={styles.heroBgImage}
              imageStyle={{ borderRadius: 20, opacity: 0.18 }}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(250,248,245,0.70)', 'rgba(250,248,245,0.96)']}
                style={styles.heroGradientOverlay}
              >
                <View style={styles.surtitreBadge}>
                  <Sparkles size={13} color="#C05A2B" />
                  <Text style={styles.surtitreText}>PLATEFORME D'ARTISANAT DU SÉNÉGAL</Text>
                </View>

                <Text style={styles.heroTitle}>
                  L'excellence sur-mesure &{'\n'}l'artisanat d'exception
                </Text>

                <Text style={styles.heroSubtitle}>
                  La plateforme d'élite pour commander vos tenues, coiffures, chaussures et créations artisanales sur-mesure auprès des meilleurs maîtres du Sénégal.
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
                    <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
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
                    <ArrowRight size={16} color="#1A1005" style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                </View>

                <View style={styles.trustBadgesRow}>
                  <View style={styles.trustItem}>
                    <CheckCircle2 size={13} color="#C05A2B" />
                    <Text style={styles.trustText}>Artisans vérifiés</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <CheckCircle2 size={13} color="#C05A2B" />
                    <Text style={styles.trustText}>Paiement sécurisé</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <CheckCircle2 size={13} color="#C05A2B" />
                    <Text style={styles.trustText}>Sur-mesure garanti</Text>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* ── Section Nos Métiers & Spécialités avec Photos ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderBlock}>
              <Text style={styles.sectionSurtitre}>NOS SPÉCIALITÉS</Text>
              <Text style={styles.sectionMainTitle}>Découvrez nos métiers d'art</Text>
              <Text style={styles.sectionSubtitle}>
                Des maîtres artisans passionnés dans chaque domaine du sur-mesure.
              </Text>
            </View>

            <View style={styles.craftsGrid}>

              {/* 1. Couture */}
              <View style={styles.craftCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500&q=80' }}
                  style={styles.craftPhoto}
                  resizeMode="cover"
                />
                <View style={styles.craftBody}>
                  <View style={styles.craftHeaderRow}>
                    <View style={styles.craftIconBox}>
                      <Scissors size={20} color="#C05A2B" strokeWidth={2} />
                    </View>
                    <Text style={styles.craftTitle}>Couture & Sur-Mesure</Text>
                  </View>
                  <Text style={styles.craftDesc}>
                    Bazin riches brodés, Caftans, Costumes sur-mesure, robes de soirée et confections traditionnelles d'exception.
                  </Text>
                </View>
              </View>

              {/* 2. Coiffure */}
              <View style={styles.craftCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80' }}
                  style={styles.craftPhoto}
                  resizeMode="cover"
                />
                <View style={styles.craftBody}>
                  <View style={styles.craftHeaderRow}>
                    <View style={styles.craftIconBox}>
                      <Sparkles size={20} color="#C05A2B" strokeWidth={2} />
                    </View>
                    <Text style={styles.craftTitle}>Coiffure & Esthétique</Text>
                  </View>
                  <Text style={styles.craftDesc}>
                    Tresses artistiques, coiffures événementielles, soins capillaires et mises en beauté traditionnelles.
                  </Text>
                </View>
              </View>

              {/* 3. Cordonnerie & Maroquinerie */}
              <View style={styles.craftCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80' }}
                  style={styles.craftPhoto}
                  resizeMode="cover"
                />
                <View style={styles.craftBody}>
                  <View style={styles.craftHeaderRow}>
                    <View style={styles.craftIconBox}>
                      <Crown size={20} color="#C05A2B" strokeWidth={2} />
                    </View>
                    <Text style={styles.craftTitle}>Cordonnerie & Cuir</Text>
                  </View>
                  <Text style={styles.craftDesc}>
                    Chaussures et babouches en cuir véritable fait main, sacs d'artisan, ceintures et maroquinerie fine.
                  </Text>
                </View>
              </View>

              {/* 4. Bijouterie */}
              <View style={styles.craftCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80' }}
                  style={styles.craftPhoto}
                  resizeMode="cover"
                />
                <View style={styles.craftBody}>
                  <View style={styles.craftHeaderRow}>
                    <View style={styles.craftIconBox}>
                      <HeartHandshake size={20} color="#C05A2B" strokeWidth={2} />
                    </View>
                    <Text style={styles.craftTitle}>Bijouterie & Orfèvrerie</Text>
                  </View>
                  <Text style={styles.craftDesc}>
                    Parures en or, filigrane d'argent et bijoux en perles traditionnelles façonnés par des orfèvres réputés.
                  </Text>
                </View>
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
                  <Text style={styles.advantageTitle}>Artisans Certifiés & Évalués</Text>
                  <Text style={styles.advantageText}>
                    Chaque maître artisan est sélectionné pour son savoir-faire d'excellence et évalué par ses clients.
                  </Text>
                </View>
              </View>

              <View style={styles.advantageItem}>
                <View style={styles.advantageIconBox}>
                  <Ruler size={20} color="#C05A2B" />
                </View>
                <View style={styles.advantageContent}>
                  <Text style={styles.advantageTitle}>Prise de Mesures Sur-Mesure</Text>
                  <Text style={styles.advantageText}>
                    Fournissez vos mensurations précises pour une confection personnalisée ajustée à la perfection.
                  </Text>
                </View>
              </View>

              <View style={styles.advantageItem}>
                <View style={styles.advantageIconBox}>
                  <Package size={20} color="#C05A2B" />
                </View>
                <View style={styles.advantageContent}>
                  <Text style={styles.advantageTitle}>Suivi en Temps Réel</Text>
                  <Text style={styles.advantageText}>
                    Suivez en direct chaque étape de fabrication de votre commande de l'atelier à la livraison.
                  </Text>
                </View>
              </View>

            </View>
          </View>

          {/* ── Footer CTA ── */}
          <View style={styles.footerBlock}>
            <Text style={styles.footerTitle}>Prêt à créer ou commander ?</Text>
            <Text style={styles.footerSub}>
              Rejoignez la plus grande communauté d'artisans d'art et de clients du Sénégal.
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
    marginBottom: 24,
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E2D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C05A2B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  brandTagline: {
    fontSize: 9,
    fontWeight: '700',
    color: '#C05A2B',
    letterSpacing: 1,
    textTransform: 'uppercase',
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

  // ── Hero Card Container ──
  heroCardContainer: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    overflow: 'hidden',
    marginBottom: 36,
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroBgImage: {
    width: '100%',
  },
  heroGradientOverlay: {
    padding: 22,
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
    marginBottom: 14,
  },
  surtitreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C05A2B',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.8,
    lineHeight: 40,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#7A6A58',
    lineHeight: 22,
    marginBottom: 24,
  },
  heroActions: {
    gap: 12,
    marginBottom: 20,
  },
  btnClient: {
    height: 52,
    backgroundColor: '#C05A2B',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
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
    paddingHorizontal: 18,
    gap: 10,
  },
  btnArtisanText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1005',
  },

  trustBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E8E2D9',
    flexWrap: 'wrap',
    gap: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7A6A58',
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
    gap: 16,
  },
  craftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    overflow: 'hidden',
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  craftPhoto: {
    width: '100%',
    height: 160,
    aspectRatio: 1.8,
  },
  craftBody: {
    padding: 16,
    gap: 8,
  },
  craftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  craftIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF4EE',
    borderWidth: 1,
    borderColor: '#F3D2C1',
    alignItems: 'center',
    justifyContent: 'center',
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
